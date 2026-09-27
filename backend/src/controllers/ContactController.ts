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
import { Op } from "sequelize";
import CreateTicketService from "../services/TicketServices/CreateTicketService";

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

  await ShowContactService(contactId, companyId);

  let ticket = await Ticket.findOne({
    where: {
      contactId: +contactId,
      companyId,
      status: { [Op.in]: ["open", "pending"] }
    },
    order: [["updatedAt", "DESC"]]
  });

  if (!ticket) {
    ticket = await CreateTicketService({
      contactId: +contactId,
      status: "open",
      userId: +userId,
      companyId
    });
  } else if (ticket.status !== "open" || ticket.userId !== +userId) {
    await ticket.update({
      status: "open",
      userId: +userId
    });
  }

  return res.status(200).json({
    ticketId: ticket.id,
    contactId: +contactId
  });
};

export const removeSelected = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const all = req.body?.all === true;
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))
    : [];

  if (!all && ids.length === 0) {
    throw new AppError("Selecione ao menos um contato.", 400);
  }

  const where: any = { companyId };
  if (!all) {
    where.id = { [Op.in]: ids };
  }

  const contacts = await (await import("../models/Contact")).default.findAll({
    where,
    attributes: ["id"]
  });

  let deleted = 0;
  const failed: number[] = [];

  for (const contact of contacts) {
    try {
      await DeleteContactService(String(contact.id));
      deleted += 1;
    } catch (_) {
      failed.push(contact.id);
    }
  }

  const io = getIO();
  contacts.forEach(contact => {
    if (!failed.includes(contact.id)) {
      io.emit(`company-${companyId}-contact`, {
        action: "delete",
        contactId: contact.id
      });
    }
  });

  return res.status(200).json({
    deleted,
    failed: failed.length,
    requested: all ? contacts.length : ids.length
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
