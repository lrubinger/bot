import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListContactsService from "../services/ContactServices/ListContactsService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import ShowContactService from "../services/ContactServices/ShowContactService";
import UpdateContactService from "../services/ContactServices/UpdateContactService";
import DeleteContactService from "../services/ContactServices/DeleteContactService";
import GetContactService from "../services/ContactServices/GetContactService";

import CheckContactNumber from "../services/WbotServices/CheckNumber";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import AppError from "../errors/AppError";
import SimpleListService, {
  SearchContactParams
} from "../services/ContactServices/SimpleListService";
import ContactCustomField from "../models/ContactCustomField";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import { Op } from "sequelize";
import CreateTicketService from "../services/TicketServices/CreateTicketService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import GetDefaultWhatsApp from "../helpers/GetDefaultWhatsApp";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

type IndexGetContactQuery = {
  name: string;
  number: string;
};

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}
interface ContactData {
  name: string;
  number: string;
  email?: string;
  extraInfo?: ExtraInfo[];
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { contacts, count, hasMore } = await ListContactsService({
    searchParam,
    pageNumber,
    companyId
  });

  const contactsWithCompany = await Promise.all(
    contacts.map(async contact => {
      const companyField = await ContactCustomField.findOne({
        where: { contactId: contact.id, name: "Empresa" }
      });

      return {
        ...(contact.toJSON() as any),
        companyName: companyField?.value || ""
      };
    })
  );

  return res.json({ contacts: contactsWithCompany, count, hasMore });
};

export const getContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { name, number } = req.body as IndexGetContactQuery;
  const { companyId } = req.user;

  const contact = await GetContactService({
    name,
    number,
    companyId
  });

  return res.status(200).json(contact);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const newContact: ContactData = req.body;
  newContact.number = newContact.number.replace("-", "").replace(" ", "");

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    number: Yup.string()
      .required()
      .matches(/^\d+$/, "Invalid number format. Only numbers is allowed.")
  });

  try {
    await schema.validate(newContact);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  await CheckIsValidContact(newContact.number, companyId);
  const validNumber = await CheckContactNumber(newContact.number, companyId);
  const number = validNumber.jid.replace(/\D/g, "");
  newContact.number = number;

  /**
   * Código desabilitado por demora no retorno
   */
  // const profilePicUrl = await GetProfilePicUrl(validNumber.jid, companyId);

  const contact = await CreateContactService({
    ...newContact,
    // profilePicUrl,
    companyId
  });

  const io = getIO();
  io.emit(`company-${companyId}-contact`, {
    action: "create",
    contact
  });

  return res.status(200).json(contact);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId } = req.user;

  const contact = await ShowContactService(contactId, companyId);

  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const contactData: ContactData = req.body;
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    name: Yup.string(),
    number: Yup.string().matches(
      /^\d+$/,
      "Invalid number format. Only numbers is allowed."
    )
  });

  try {
    await schema.validate(contactData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  await CheckIsValidContact(contactData.number, companyId);
  const validNumber = await CheckContactNumber(contactData.number, companyId);
  const number = validNumber.jid.replace(/\D/g, "");
  contactData.number = number;

  const { contactId } = req.params;

  const contact = await UpdateContactService({
    contactData,
    contactId,
    companyId
  });

  const io = getIO();
  io.emit(`company-${companyId}-contact`, {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const startConversation = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId, id: userId } = req.user;

  const contact = await ShowContactService(contactId, companyId);

  if (contact.isGroup) {
    throw new AppError("Não é possível iniciar uma conversa individual com um grupo.", 400);
  }

  const whatsapp = await GetDefaultWhatsApp(companyId, +userId);

  // Valida e normaliza o número no momento em que a conversa é iniciada.
  // Isso evita criar um atendimento com um telefone importado em formato
  // diferente do JID real usado pelo WhatsApp.
  const digits = String(contact.number || "").replace(/\D/g, "");
  if (!digits) {
    throw new AppError("Este contato não possui telefone válido.", 400);
  }

  try {
    const validNumber = await CheckContactNumber(digits, companyId);
    const normalized = String(validNumber?.jid || "").replace(/\D/g, "");
    if (normalized && normalized !== digits) {
      await contact.update({ number: normalized });
    }
  } catch (error: any) {
    throw new AppError(
      error?.message === "ERR_CHECK_NUMBER"
        ? "Este telefone não foi encontrado no WhatsApp."
        : "Não foi possível validar o telefone deste contato no WhatsApp.",
      400
    );
  }

  const ticket = await FindOrCreateTicketService(
    contact,
    whatsapp.id,
    0,
    companyId
  );

  await ticket.update({
    status: "open",
    userId: +userId,
    whatsappId: whatsapp.id,
    archived: false
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ticket`, {
    action: "update",
    ticket
  });

  return res.status(200).json({
    ticketId: ticket.id,
    contactId: contact.id,
    whatsappId: whatsapp.id
  });
};


export const removeSelected = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const all = req.body?.all === true;
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids
        .map((id: any) => Number(id))
        .filter((id: number) => Number.isFinite(id))
    : [];

  if (!all && ids.length === 0) {
    throw new AppError("Selecione ao menos um contato.", 400);
  }

  const where: any = { companyId };
  if (!all) {
    where.id = { [Op.in]: ids };
  }

  const before = await Contact.count({ where });

  // Usa exclusão em lote diretamente no banco. As relações de Tickets,
  // Messages, Schedules e campos personalizados possuem ON DELETE CASCADE,
  // portanto esta operação remove de fato todos os contatos selecionados,
  // inclusive aqueles que antes falhavam na exclusão um a um.
  const deleted = await Contact.destroy({ where });

  const remaining = all
    ? await Contact.count({ where: { companyId } })
    : await Contact.count({ where });

  if (remaining > 0) {
    throw new AppError(
      `A exclusão não foi concluída. Ainda restam ${remaining} contato(s).`,
      409
    );
  }

  const io = getIO();
  io.emit(`company-${companyId}-contact`, {
    action: "reload"
  });

  return res.status(200).json({
    deleted,
    requested: before,
    remaining
  });
};


export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId } = req.user;

  await ShowContactService(contactId, companyId);

  await DeleteContactService(contactId);

  const io = getIO();
  io.emit(`company-${companyId}-contact`, {
    action: "delete",
    contactId
  });

  return res.status(200).json({ message: "Contact deleted" });
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { name } = req.query as unknown as SearchContactParams;
  const { companyId } = req.user;

  const contacts = await SimpleListService({ name, companyId });

  return res.json(contacts);
};
