import Message from "../models/Message";
import Ticket from "../models/Ticket";
import GetTicketWbot from "./GetTicketWbot";
import { jidNormalizedUser } from "@whiskeysockets/baileys";

export interface TicketAddress {
  chatJid?: string;
  phoneJid?: string;
  number?: string;
  allFromMe?: boolean;
}

const isChatJid = (value: any): boolean =>
  typeof value === "string" &&
  (value.endsWith("@s.whatsapp.net") || value.endsWith("@lid"));

const isPhoneJid = (value: any): boolean =>
  typeof value === "string" && value.endsWith("@s.whatsapp.net");

export default async function ResolveTicketAddress(
  ticketId: number
): Promise<TicketAddress> {
  const messages = await Message.findAll({
    where: { ticketId },
    attributes: ["dataJson"],
    order: [["createdAt", "DESC"]],
    limit: 20
  });

  let chatJid: string | undefined;
  let phoneJid: string | undefined;
  let parsedCount = 0;
  let fromMeCount = 0;

  for (const message of messages) {
    if (!message.dataJson) continue;

    try {
      const raw = JSON.parse(message.dataJson);
      const key: any = raw?.key || {};
      parsedCount += 1;
      if (key.fromMe === true) fromMeCount += 1;

      const rawRemote = String(key.remoteJid || "");
      const rawRemoteAlt = String(key.remoteJidAlt || "");
      // Para conversas individuais, o destinatário deve ser resolvido apenas
      // pelos JIDs remotos. participant/participantAlt podem representar a
      // própria sessão e faziam o Baileys aceitar o envio para o contato errado.
      if (!chatJid) {
        chatJid = [rawRemote, rawRemoteAlt].find(isChatJid);
      }

      if (!phoneJid) {
        phoneJid = [rawRemoteAlt, rawRemote].find(isPhoneJid);
      }

      if (chatJid && phoneJid) break;
    } catch (_) {}
  }

  // Conversas recentes do WhatsApp podem vir somente com @lid.
  // Quando isso acontecer, consulta o mapeamento LID -> PN da sessão ativa.
  if (!phoneJid && chatJid?.endsWith("@lid")) {
    try {
      const ticket = await Ticket.findByPk(ticketId);
      if (ticket) {
        const wbot: any = await GetTicketWbot(ticket);
        const mapped =
          await wbot?.signalRepository?.lidMapping?.getPNForLID?.(chatJid);
        if (mapped) {
          const normalized = jidNormalizedUser(String(mapped));
          if (normalized?.endsWith("@s.whatsapp.net")) {
            phoneJid = normalized;
          }
        }
      }
    } catch (_) {}
  }

  const number = phoneJid ? phoneJid.replace(/\D/g, "") : undefined;

  return {
    chatJid,
    phoneJid,
    number,
    allFromMe: parsedCount > 0 && fromMeCount === parsedCount
  };
}
