import { WAMessage } from "@whiskeysockets/baileys";
import WALegacySocket from "@whiskeysockets/baileys"
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<WAMessage> => {
  let options = {};
  const wbot = await GetTicketWbot(ticket);
  let number = `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;

  if (!ticket.isGroup) {
    const lastMessage = await Message.findOne({
      where: { ticketId: ticket.id },
      order: [["createdAt", "DESC"]]
    });

    if (lastMessage?.dataJson) {
      try {
        const raw = JSON.parse(lastMessage.dataJson);
        const key: any = raw?.key || {};
        const candidates = [
          key.remoteJidAlt,
          key.remoteJid,
          key.participantAlt,
          key.participant
        ].filter(Boolean);

        const phoneJid = candidates.find((jid: string) =>
          String(jid).endsWith("@s.whatsapp.net")
        );

        if (phoneJid) number = phoneJid;
      } catch (_) {}
    }

    if (!String(number).endsWith("@s.whatsapp.net")) {
      const normalized = String(ticket.contact.number || "").replace(/\D/g, "");
      number = `${normalized}@s.whatsapp.net`;
    }
  }

  if (quotedMsg) {
      const chatMessages = await Message.findOne({
        where: {
          id: quotedMsg.id
        }
      });

      if (chatMessages) {
        const msgFound = JSON.parse(chatMessages.dataJson);

        options = {
          quoted: {
            key: msgFound.key,
            message: {
              extendedTextMessage: msgFound.message.extendedTextMessage
            }
          }
        };
      }
    
  }

  try {
    const sentMessage = await wbot.sendMessage(number,{
        text: formatBody(body, ticket.contact)
      },
      {
        ...options
      }
    );
    await ticket.update({ lastMessage: formatBody(body, ticket.contact) });
    return sentMessage;
  } catch (err: any) {
    Sentry.captureException(err);
    console.log(err);
    if (err instanceof AppError) throw err;
    const detail = String(err?.message || err || "erro desconhecido");
    throw new AppError(`Não foi possível enviar a mensagem pelo WhatsApp: ${detail}`, 400);
  }
};

export default SendWhatsAppMessage;
