import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import { isNil } from "lodash";
import { Op } from "sequelize";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  companyId: number;
  extraInfo?: ExtraInfo[];
  whatsappId?: number;
  aliases?: string[];
}

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  companyId,
  extraInfo = [],
  whatsappId,
  aliases = []
}: Request): Promise<Contact> => {
  const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");

  const io = getIO();
  let contact: Contact | null;

  contact = await Contact.findOne({
    where: {
      number,
      companyId
    }
  });

  const aliasNumbers = Array.from(
    new Set(
      aliases
        .map(value => String(value || "").replace(/[^0-9]/g, ""))
        .filter(value => value && value !== number)
    )
  );

  const aliasContacts = aliasNumbers.length
    ? await Contact.findAll({
        where: {
          companyId,
          number: { [Op.in]: aliasNumbers }
        }
      })
    : [];

  if (!contact && aliasContacts.length) {
    const preferred = aliasContacts[0];

    try {
      await preferred.update({
        number,
        name: name || preferred.name,
        profilePicUrl,
        email: email || preferred.email,
        whatsappId: whatsappId || preferred.whatsappId
      });
      contact = preferred;
    } catch (_) {
      contact = await Contact.findOne({ where: { number, companyId } });
    }
  }

  if (contact) {
    const currentName = String(contact.name || "").trim();
    const incomingName = String(name || "").trim();
    const currentLooksTechnical =
      !currentName ||
      currentName.includes("@g.us") ||
      currentName.includes("@lid") ||
      /^\d+$/.test(currentName) ||
      /^\d+-\d+$/.test(currentName);

    const updateData: any = { profilePicUrl };

    if (incomingName && (currentLooksTechnical || incomingName !== number)) {
      updateData.name = incomingName;
    }

    if (isNil(contact.whatsappId) && whatsappId) {
      updateData.whatsappId = whatsappId;
    }

    await contact.update(updateData);

    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
      action: "update",
      contact
    });
  } else {
    contact = await Contact.create({
      name,
      number,
      profilePicUrl,
      email,
      isGroup,
      extraInfo,
      companyId,
      whatsappId
    });

    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
      action: "create",
      contact
    });
  }

  if (contact && aliasContacts.length) {
    for (const aliasContact of aliasContacts) {
      if (aliasContact.id === contact.id) continue;

      const aliasTickets = await Ticket.findAll({
        where: { contactId: aliasContact.id, companyId },
        order: [["updatedAt", "DESC"]]
      });

      for (const aliasTicket of aliasTickets) {
        const existingTicket = await Ticket.findOne({
          where: {
            contactId: contact.id,
            companyId,
            whatsappId: aliasTicket.whatsappId,
            id: { [Op.ne]: aliasTicket.id }
          },
          order: [["updatedAt", "DESC"]]
        });

        if (existingTicket) {
          await Message.update(
            { ticketId: existingTicket.id, contactId: contact.id },
            { where: { ticketId: aliasTicket.id, companyId } }
          );
          await aliasTicket.update({
            archived: true,
            pinned: false,
            status: "closed",
            contactId: contact.id
          });
        } else {
          await aliasTicket.update({ contactId: contact.id });
          await Message.update(
            { contactId: contact.id },
            { where: { ticketId: aliasTicket.id, companyId } }
          );
        }
      }
    }
  }

  return contact;
};

export default CreateOrUpdateContactService;
