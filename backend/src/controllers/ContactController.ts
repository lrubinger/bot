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
import Message from "../models/Message";
import ContactJid from "../models/ContactJid";
import { getWbot } from "../libs/wbot";
import { Op } from "sequelize";
import CreateTicketService from "../services/TicketServices/CreateTicketService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import GetDefaultWhatsApp from "../helpers/GetDefaultWhatsApp";
import ResolveTicketAddress from "../helpers/ResolveTicketAddress";

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
  const wbot: any = getWbot(whatsapp.id);

  const digits = String(contact.number || "").replace(/\D/g, "");
  if (!digits) {
    throw new AppError("Este contato não possui telefone válido.", 400);
  }

  let phoneJid = "";
  try {
    const validNumber = await CheckContactNumber(digits, companyId);
    phoneJid = String(validNumber?.jid || "");
    const normalized = phoneJid.replace(/\D/g, "");
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

  // Se a conversa já chegou antes pelo identificador LID do WhatsApp,
  // encontra esse ticket e o religa ao contato correto da agenda. Isso evita
  // criar uma segunda conversa para a mesma pessoa.
  let lidJid = "";
  try {
    const mapped = await wbot?.signalRepository?.lidMapping?.getLIDForPN?.(phoneJid);
    if (mapped) lidJid = String(mapped);
  } catch (_) {}

  const jidAliases = Array.from(new Set(
    [phoneJid, lidJid].filter(Boolean)
  ));

  for (const jid of jidAliases) {
    await ContactJid.upsert({
      companyId,
      contactId: contact.id,
      whatsappId: whatsapp.id,
      jid
    });
  }

  let ticket: Ticket | null = await Ticket.findOne({
    where: {
      contactId: contact.id,
      companyId,
      whatsappId: whatsapp.id
    },
    order: [["updatedAt", "DESC"]]
  });

  if (!ticket && lidJid) {
    const lidDigits = lidJid.replace(/\D/g, "");
    const candidateMessage = await Message.findOne({
      where: {
        companyId,
        dataJson: { [Op.like]: `%${lidDigits}%` }
      },
      order: [["createdAt", "DESC"]]
    });

    if (candidateMessage) {
      const candidateTicket = await Ticket.findOne({
        where: {
          id: candidateMessage.ticketId,
          companyId,
          whatsappId: whatsapp.id
        }
      });

      if (candidateTicket && !candidateTicket.isGroup) {
        const oldContactId = candidateTicket.contactId;

        await candidateTicket.update({
          contactId: contact.id,
          status: "open",
          userId: +userId,
          whatsappId: whatsapp.id,
          archived: false
        });

        await Message.update(
          { contactId: contact.id },
          { where: { ticketId: candidateTicket.id, companyId } }
        );

        if (oldContactId && oldContactId !== contact.id) {
          const remainingTickets = await Ticket.count({
            where: { contactId: oldContactId, companyId }
          });
          const remainingMessages = await Message.count({
            where: { contactId: oldContactId, companyId }
          });

          if (remainingTickets === 0 && remainingMessages === 0) {
            await Contact.destroy({
              where: { id: oldContactId, companyId }
            });
          }
        }

        ticket = candidateTicket;
      }
    }
  }

  if (ticket && lidJid) {
    const lidDigits = lidJid.replace(/\D/g, "");
    const duplicateMessages = await Message.findAll({
      where: {
        companyId,
        ticketId: { [Op.ne]: ticket.id },
        dataJson: { [Op.like]: `%${lidDigits}%` }
      },
      attributes: ["ticketId"],
      group: ["ticketId"]
    });

    const duplicateTicketIds = Array.from(
      new Set(duplicateMessages.map(message => Number(message.ticketId)).filter(Boolean))
    );

    for (const duplicateTicketId of duplicateTicketIds) {
      const duplicateTicket = await Ticket.findOne({
        where: {
          id: duplicateTicketId,
          companyId,
          whatsappId: whatsapp.id,
          isGroup: false
        }
      });

      if (!duplicateTicket) continue;

      const duplicateContactId = duplicateTicket.contactId;

      await Message.update(
        {
          ticketId: ticket.id,
          contactId: contact.id
        },
        {
          where: {
            ticketId: duplicateTicket.id,
            companyId
          }
        }
      );

      await duplicateTicket.update({
        archived: true,
        pinned: false,
        status: "closed",
        contactId: contact.id
      });

      if (duplicateContactId && duplicateContactId !== contact.id) {
        const remainingTickets = await Ticket.count({
          where: {
            contactId: duplicateContactId,
            companyId,
            id: { [Op.ne]: duplicateTicket.id }
          }
        });
        const remainingMessages = await Message.count({
          where: {
            contactId: duplicateContactId,
            companyId
          }
        });

        if (remainingTickets === 0 && remainingMessages === 0) {
          await Contact.destroy({
            where: {
              id: duplicateContactId,
              companyId
            }
          });
        }
      }
    }
  }

  if (!ticket) {
    ticket = await FindOrCreateTicketService(
      contact,
      whatsapp.id,
      0,
      companyId
    );
  }

  await ticket.update({
    contactId: contact.id,
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
