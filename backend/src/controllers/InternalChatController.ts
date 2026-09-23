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

const canTalk = (requester: User, target: User): boolean =>
  requester.id !== target.id &&
  (requester.super === true ||
   target.super === true ||
   requester.companyId === target.companyId);

export const contacts = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);

  const where = requester.super
    ? { id: { [Op.ne]: requester.id } }
    : {
        id: { [Op.ne]: requester.id },
        [Op.or]: [
          { companyId: requester.companyId },
          { super: true }
        ]
      };

  const users = await User.findAll({
    where: where as any,
    attributes: ["id", "name", "email", "companyId", "super"],
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
    order: [["super", "DESC"], ["name", "ASC"]]
  });

  return res.json(users);
};

export const messages = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);
  const target = await User.findByPk(+req.params.userId);

  if (!target || !canTalk(requester, target)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

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
