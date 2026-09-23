import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateService from "../services/ChatService/CreateService";
import ListService from "../services/ChatService/ListService";
import ShowFromUuidService from "../services/ChatService/ShowFromUuidService";
import DeleteService from "../services/ChatService/DeleteService";
import FindMessages from "../services/ChatService/FindMessages";
import UpdateService from "../services/ChatService/UpdateService";

import Chat from "../models/Chat";
import CreateMessageService from "../services/ChatService/CreateMessageService";
import User from "../models/User";
import ChatUser from "../models/ChatUser";

type IndexQuery = {
  pageNumber: string;
  companyId: string | number;
  ownerId?: number;
};

type StoreData = {
  users: any[];
  title: string;
};

type FindParams = {
  companyId: number;
  ownerId?: number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber = "1" } = req.query as unknown as IndexQuery;
  const ownerId = +req.user.id;
  const requester = await User.findByPk(ownerId);

  if (requester?.super) {
    const limit = 50;
    const offset = limit * (+pageNumber - 1);
    const { count, rows: records } = await Chat.findAndCountAll({
      include: [
        { model: User, as: "owner" },
        { model: ChatUser, as: "users", include: [{ model: User, as: "user" }] }
      ],
      limit,
      offset,
      order: [["updatedAt", "DESC"]]
    });
    return res.json({ records, count, hasMore: count > offset + records.length });
  }

  const { records, count, hasMore } = await ListService({ ownerId, pageNumber });
  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const ownerId = +req.user.id;
  const requester = await User.findByPk(ownerId);
  if (!requester) return res.status(404).json({ error: "ERR_NO_USER_FOUND" });

  const data = req.body as StoreData;
  const requestedIds = Array.from(new Set((data.users || []).map(u => +(u.id || u.userId)).filter(Boolean)));
  const requestedUsers = requestedIds.length
    ? await User.findAll({ where: { id: requestedIds } })
    : [];

  let chatCompanyId = requester.companyId;

  if (!requester.super) {
    const invalid = requestedUsers.some(u => u.companyId !== requester.companyId && !u.super);
    if (invalid) return res.status(403).json({ error: "ERR_CHAT_COMPANY_SCOPE" });
  } else {
    const targetCompanies = Array.from(new Set(requestedUsers.filter(u => !u.super).map(u => u.companyId)));
    if (targetCompanies.length > 1) {
      return res.status(400).json({ error: "Selecione usuários de apenas uma empresa por conversa." });
    }
    if (targetCompanies.length === 1) chatCompanyId = targetCompanies[0];
  }

  // PortoPlan master users are always participants, so every company can contact support
  // without gaining access to users from other companies.
  const masters = await User.findAll({ where: { super: true } });
  const merged = new Map<number, User>();
  [...requestedUsers, ...masters].forEach(u => {
    if (u.id !== ownerId) merged.set(u.id, u);
  });

  const record = await CreateService({
    ...data,
    users: Array.from(merged.values()).map(u => ({ id: u.id })),
    ownerId,
    companyId: chatCompanyId
  });

  const io = getIO();
  record.users.forEach(user => {
    io.emit(`company-${chatCompanyId}-chat-user-${user.userId}`, {
      action: "create",
      record
    });
  });

  return res.status(200).json(record);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body;
  const { id } = req.params;

  const record = await UpdateService({
    ...data,
    id: +id
  });

  const io = getIO();

  record.users.forEach(user => {
    io.emit(`company-${companyId}-chat-user-${user.userId}`, {
      action: "update",
      record
    });
  });

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const record = await ShowFromUuidService(id);

  return res.status(200).json(record);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteService(id);

  const io = getIO();
  io.emit(`company-${companyId}-chat`, {
    action: "delete",
    id
  });

  return res.status(200).json({ message: "Chat deleted" });
};

export const saveMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { message } = req.body;
  const { id } = req.params;
  const senderId = +req.user.id;
  const chatId = +id;

  const newMessage = await CreateMessageService({
    chatId,
    senderId,
    message
  });

  const chat = await Chat.findByPk(chatId, {
    include: [
      { model: User, as: "owner" },
      { model: ChatUser, as: "users" }
    ]
  });

  const io = getIO();
  io.emit(`company-${companyId}-chat-${chatId}`, {
    action: "new-message",
    newMessage,
    chat
  });

  io.emit(`company-${companyId}-chat`, {
    action: "new-message",
    newMessage,
    chat
  });

  return res.json(newMessage);
};

export const checkAsRead = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { userId } = req.body;
  const { id } = req.params;

  const chatUser = await ChatUser.findOne({ where: { chatId: id, userId } });
  await chatUser.update({ unreads: 0 });

  const chat = await Chat.findByPk(id, {
    include: [
      { model: User, as: "owner" },
      { model: ChatUser, as: "users" }
    ]
  });

  const io = getIO();
  io.emit(`company-${companyId}-chat-${id}`, {
    action: "update",
    chat
  });

  io.emit(`company-${companyId}-chat`, {
    action: "update",
    chat
  });

  return res.json(chat);
};

export const messages = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { pageNumber } = req.query as unknown as IndexQuery;
  const { id: chatId } = req.params;
  const ownerId = +req.user.id;

  const { records, count, hasMore } = await FindMessages({
    chatId,
    ownerId,
    pageNumber
  });

  return res.json({ records, count, hasMore });
};
