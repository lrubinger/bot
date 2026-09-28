import Message from "../models/Message";

export interface TicketAddress {
  chatJid?: string;
  phoneJid?: string;
  number?: string;
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

  for (const message of messages) {
    if (!message.dataJson) continue;

    try {
      const raw = JSON.parse(message.dataJson);
      const key: any = raw?.key || {};

      const rawRemote = String(key.remoteJid || "");
      const rawRemoteAlt = String(key.remoteJidAlt || "");
      const rawParticipant = String(key.participant || "");
      const rawParticipantAlt = String(key.participantAlt || "");

      if (!chatJid) {
        chatJid =
          [rawRemote, rawRemoteAlt, rawParticipant, rawParticipantAlt].find(isChatJid);
      }

      if (!phoneJid) {
        phoneJid =
          [rawRemoteAlt, rawParticipantAlt, rawRemote, rawParticipant].find(isPhoneJid);
      }

      if (chatJid && phoneJid) break;
    } catch (_) {}
  }

  const number = phoneJid ? phoneJid.replace(/\D/g, "") : undefined;

  return { chatJid, phoneJid, number };
}
