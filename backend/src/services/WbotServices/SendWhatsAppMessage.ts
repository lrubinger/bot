import { WAMessage, jidNormalizedUser } from "@whiskeysockets/baileys";
import WALegacySocket from "@whiskeysockets/baileys"
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import ResolveTicketAddress from "../../helpers/ResolveTicketAddress";
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
  const defaultRecipient = `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
  let resolvedChatJid: string | undefined;
  let resolvedPhoneJid: string | undefined;
  let selfChat = false;

  if (!ticket.isGroup) {
    const resolved = await ResolveTicketAddress(ticket.id);
    resolvedChatJid = resolved.chatJid;
    resolvedPhoneJid = resolved.phoneJid;
    const ownName = String(ticket.contact?.name || "").trim().toLowerCase();
    selfChat = Boolean(
      wbot.user?.id &&
      resolved.allFromMe &&
      (ownName === "eu" || ownName.startsWith("eu ") || ownName.startsWith("eu-") || ownName.startsWith("eu_"))
    );
  }

  const recipients = ticket.isGroup
    ? [defaultRecipient]
    : selfChat && wbot.user?.id
      ? [jidNormalizedUser(wbot.user.id)]
      : Array.from(new Set([
          resolvedPhoneJid,
          defaultRecipient,
          resolvedChatJid
        ].filter(Boolean))) as string[];

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
    let sentMessage: WAMessage | undefined;
    let lastError: any;

    for (const recipient of recipients) {
      try {
        const normalizedRecipient = jidNormalizedUser(recipient);
        sentMessage = await wbot.sendMessage(
          normalizedRecipient,
          { text: formatBody(body, ticket.contact) },
          { ...options }
        );
        if (sentMessage) break;
      } catch (sendError) {
        lastError = sendError;
      }
    }

    if (!sentMessage) {
      throw lastError || new Error("WhatsApp não retornou confirmação do envio.");
    }

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
