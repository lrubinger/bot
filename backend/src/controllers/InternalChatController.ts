import { Op } from "sequelize";
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import User from "../models/User";
import Company from "../models/Company";
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
    const unread = await InternalChatMessage.count({
      where: {
        senderId: user.id,
        recipientId: requester.id,
        readAt: { [Op.is]: null }
      }
    });

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
  const count = await InternalChatMessage.count({
    where: {
      recipientId: requester.id,
      readAt: { [Op.is]: null }
    }
  });
  return res.json({ count });
};

export const messages = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);
  const target = await User.findByPk(+req.params.userId);

  if (!target || !canTalk(requester, target)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await InternalChatMessage.update(
    { readAt: new Date() },
    {
      where: {
        senderId: target.id,
        recipientId: requester.id,
        readAt: { [Op.is]: null }
      }
    }
  );

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
    body,
    readAt: null
  } as any);

  return res.status(201).json(item);
};
