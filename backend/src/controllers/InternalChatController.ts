import { Op } from "sequelize";
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import User from "../models/User";
import Company from "../models/Company";
import Setting from "../models/Setting";
import InternalChatMessage from "../models/InternalChatMessage";

const getRequester = async (req: Request): Promise<User> => {
  const user = await User.findByPk(req.user.id);
  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);
  return user;
};

const isMaster = (user: User): boolean =>
  user.super === true ||
  String(user.email || "").toLowerCase() === "admin@portoplan.com.br";

const canTalk = (requester: User, target: User): boolean =>
  requester.id !== target.id &&
  (isMaster(requester) ||
   isMaster(target) ||
   requester.companyId === target.companyId);

const readKey = (requesterId: number, targetId: number) =>
  `internalChatRead:${requesterId}:${targetId}`;

const getReadAt = async (requester: User, targetId: number): Promise<Date | null> => {
  const marker = await Setting.findOne({
    where: {
      companyId: requester.companyId,
      key: readKey(requester.id, targetId)
    }
  });

  if (!marker?.value) return null;
  const date = new Date(marker.value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const markRead = async (requester: User, targetId: number): Promise<void> => {
  const key = readKey(requester.id, targetId);
  const value = new Date().toISOString();

  const [marker] = await Setting.findOrCreate({
    where: { companyId: requester.companyId, key },
    defaults: { companyId: requester.companyId, key, value }
  });

  await marker.update({ value });
};

const unreadFrom = async (requester: User, senderId: number): Promise<number> => {
  const readAt = await getReadAt(requester, senderId);
  const where: any = {
    senderId,
    recipientId: requester.id
  };
  if (readAt) where.createdAt = { [Op.gt]: readAt };

  return InternalChatMessage.count({ where });
};

export const contacts = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);

  const where = isMaster(requester)
    ? { id: { [Op.ne]: requester.id } }
    : {
        id: { [Op.ne]: requester.id },
        [Op.or]: [
          { companyId: requester.companyId },
          { super: true },
          { email: "admin@portoplan.com.br" }
        ]
      };

  const users = await User.findAll({
    where: where as any,
    attributes: ["id", "name", "email", "companyId", "super"],
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
    order: [["super", "DESC"], ["name", "ASC"]]
  });

  const result = await Promise.all(users.map(async user => {
    const unread = await unreadFrom(requester, user.id);
    const last = await InternalChatMessage.findOne({
      where: {
        [Op.or]: [
          { senderId: requester.id, recipientId: user.id },
          { senderId: user.id, recipientId: requester.id }
        ]
      },
      order: [["createdAt", "DESC"]],
      attributes: ["body", "createdAt"]
    });

    const plain: any = user.toJSON();
    return {
      ...plain,
      unread,
      lastMessage: last?.body || "",
      lastMessageAt: last?.createdAt || null
    };
  }));

  result.sort((a: any, b: any) => {
    if (b.unread !== a.unread) return b.unread - a.unread;
    const ad = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bd = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bd - ad;
  });

  return res.json(result);
};

export const unread = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);
  const contactsResult = await contactsData(requester);
  const count = contactsResult.reduce((sum, item: any) => sum + Number(item.unread || 0), 0);
  return res.json({ count });
};

const contactsData = async (requester: User): Promise<any[]> => {
  const where = isMaster(requester)
    ? { id: { [Op.ne]: requester.id } }
    : {
        id: { [Op.ne]: requester.id },
        [Op.or]: [
          { companyId: requester.companyId },
          { super: true },
          { email: "admin@portoplan.com.br" }
        ]
      };

  const users = await User.findAll({
    where: where as any,
    attributes: ["id", "name", "email", "companyId", "super"],
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }]
  });

  return Promise.all(users.map(async user => ({
    ...(user.toJSON() as any),
    unread: await unreadFrom(requester, user.id)
  })));
};

export const messages = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);
  const target = await User.findByPk(+req.params.userId);

  if (!target || !canTalk(requester, target)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await markRead(requester, target.id);

  const items = await InternalChatMessage.findAll({
    where: {
      [Op.or]: [
        { senderId: requester.id, recipientId: target.id },
        { senderId: target.id, recipientId: requester.id }
      ]
    },
    order: [["createdAt", "ASC"]],
    limit: 300
  });

  return res.json(items);
};

export const send = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);
  const target = await User.findByPk(+req.params.userId);
  const body = String(req.body.body || "").trim();

  if (!body) throw new AppError("Mensagem vazia.", 400);
  if (body.length > 4000) throw new AppError("Mensagem muito longa.", 400);

  if (!target || !canTalk(requester, target)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const item = await InternalChatMessage.create({
    senderId: requester.id,
    recipientId: target.id,
    companyId: requester.super ? target.companyId : requester.companyId,
    body
  } as any);

  return res.status(201).json(item);
};
