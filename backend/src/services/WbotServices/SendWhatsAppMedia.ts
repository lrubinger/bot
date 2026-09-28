import { WAMessage, AnyMessageContent, jidNormalizedUser } from "@whiskeysockets/baileys";
import * as Sentry from "@sentry/node";
import fs from "fs";
import { exec } from "child_process";
import path from "path";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import ResolveTicketAddress from "../../helpers/ResolveTicketAddress";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import mime from "mime-types";
import formatBody from "../../helpers/Mustache";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

const processAudio = async (audio: string): Promise<string> => {
  const outputAudio = `${publicFolder}/${new Date().getTime()}.mp3`;
  return new Promise((resolve, reject) => {
    exec(
      `${ffmpegPath.path} -i ${audio} -vn -ab 128k -ar 44100 -f ipod ${outputAudio} -y`,
      (error, _stdout, _stderr) => {
        if (error) reject(error);
        fs.unlinkSync(audio);
        resolve(outputAudio);
      }
    );
  });
};

const processAudioFile = async (audio: string): Promise<string> => {
  const outputAudio = `${publicFolder}/${new Date().getTime()}.mp3`;
  return new Promise((resolve, reject) => {
    exec(
      `${ffmpegPath.path} -i ${audio} -vn -ar 44100 -ac 2 -b:a 192k ${outputAudio}`,
      (error, _stdout, _stderr) => {
        if (error) reject(error);
        fs.unlinkSync(audio);
        resolve(outputAudio);
      }
    );
  });
};

export const getMessageOptions = async (
  fileName: string,
  pathMedia: string,
  body?: string
): Promise<any> => {
  const mimeType = mime.lookup(pathMedia);

  try {
    if (!mimeType) {
      throw new Error("Invalid mimetype");
    }

    const typeMessage = mimeType.split("/")[0];
    let options: AnyMessageContent;

    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: body ? body : '',
        fileName: fileName
        // gifPlayback: true
      };
    } else if (typeMessage === "audio") {
      const typeAudio = true; //fileName.includes("audio-record-site");
      const convert = await processAudio(pathMedia);
      if (typeAudio) {
        options = {
          audio: fs.readFileSync(convert),
          mimetype: typeAudio ? "audio/mp4" : mimeType,
          caption: body ? body : null,
          ptt: true
        };
      } else {
        options = {
          audio: fs.readFileSync(convert),
          mimetype: typeAudio ? "audio/mp4" : mimeType,
          caption: body ? body : null,
          ptt: true
        };
      }
    } else if (typeMessage === "document") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body ? body : null,
        fileName: fileName,
        mimetype: mimeType
      };
    } else if (typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body ? body : null,
        fileName: fileName,
        mimetype: mimeType
      };
    } else {
      options = {
        image: fs.readFileSync(pathMedia),
        caption: body ? body : null
      };
    }

    return options;
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
    return null;
  }
};

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<WAMessage> => {
  try {
    const wbot = await GetTicketWbot(ticket);

    const pathMedia = media.path;
    const typeMessage = media.mimetype.split("/")[0];
    let options: AnyMessageContent;
    const bodyMessage = formatBody(body, ticket.contact)

    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        fileName: media.originalname
        // gifPlayback: true
      };
    } else if (typeMessage === "audio") {
      const typeAudio = media.originalname.includes("audio-record-site");
      if (typeAudio) {
        const convert = await processAudio(media.path);
        options = {
          audio: fs.readFileSync(convert),
          mimetype: typeAudio ? "audio/mp4" : media.mimetype,
          ptt: true
        };
      } else {
        const convert = await processAudioFile(media.path);
        options = {
          audio: fs.readFileSync(convert),
          mimetype: typeAudio ? "audio/mp4" : media.mimetype
        };
      }
    } else if (typeMessage === "document" || typeMessage === "text") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        fileName: media.originalname,
        mimetype: media.mimetype
      };
    } else if (typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        fileName: media.originalname,
        mimetype: media.mimetype
      };
    } else {
      options = {
        image: fs.readFileSync(pathMedia),
        caption: bodyMessage,
      };
    }

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

    const contactDigits = String(ticket.contact?.number || "").replace(/\D/g, "");
    const defaultRecipientIsSafe =
      ticket.isGroup ||
      (contactDigits.length >= 10 && contactDigits.length <= 13);

    // Prioriza o JID real da conversa armazenado nas mensagens. Antes o envio
    // tentava primeiro o telefone salvo no contato; quando esse campo continha
    // um LID convertido em número, o Baileys podia aceitar o envio localmente
    // sem entregar ao contato correto.
    const recipients = ticket.isGroup
      ? [defaultRecipient]
      : selfChat && wbot.user?.id
        ? Array.from(new Set([
            resolvedChatJid,
            (wbot.user as any)?.lid,
            wbot.user.id
          ].filter(Boolean))) as string[]
        : Array.from(new Set([
            resolvedChatJid,
            resolvedPhoneJid,
            defaultRecipientIsSafe ? defaultRecipient : undefined
          ].filter(Boolean))) as string[];

    let sentMessage: WAMessage | undefined;
    let lastError: any;

    for (const recipient of recipients) {
      try {
        const normalizedRecipient = jidNormalizedUser(recipient);
        sentMessage = await wbot.sendMessage(normalizedRecipient, { ...options });
        if (sentMessage) break;
      } catch (sendError) {
        lastError = sendError;
      }
    }

    if (!sentMessage) {
      throw lastError || new Error("WhatsApp não retornou confirmação do envio.");
    }

    await ticket.update({ lastMessage: bodyMessage });

    return sentMessage;
  } catch (err: any) {
    Sentry.captureException(err);
    console.log(err);
    const detail = String(err?.message || err || "erro desconhecido");
    throw new AppError(`Não foi possível enviar a mídia pelo WhatsApp: ${detail}`, 400);
  }
};

export default SendWhatsAppMedia;
