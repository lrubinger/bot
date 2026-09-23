import { Request, Response } from "express";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import Company from "../models/Company";
import AppError from "../errors/AppError";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import { getWbot, removeWbot } from "../libs/wbot";

const publicAttributes = [
  "id",
  "name",
  "email",
  "phone",
  "address",
  "profile",
  "super",
  "companyId",
  "whatsappId"
];

const getRequester = async (req: Request): Promise<User> => {
  const user = await User.findByPk(req.user.id);
  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);
  return user;
};

const canAccessUser = (requester: User, targetId: number): boolean =>
  requester.super === true || requester.id === targetId;

export const show = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);
  const targetId = req.params.userId ? +req.params.userId : requester.id;

  if (!canAccessUser(requester, targetId)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await User.findByPk(targetId, {
    attributes: publicAttributes,
    include: [
      { model: Company, as: "company", attributes: ["id", "name", "phone", "email"] },
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name", "status", "number", "qrcode"] }
    ]
  });

  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);
  return res.json(user);
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);

  if (!requester.super) {
    const current = await User.findByPk(requester.id, {
      attributes: publicAttributes,
      include: [{ model: Company, as: "company", attributes: ["id", "name"] }]
    });
    return res.json([current]);
  }

  const users = await User.findAll({
    attributes: publicAttributes,
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
    order: [["name", "ASC"]]
  });

  return res.json(users);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);
  const targetId = req.params.userId ? +req.params.userId : requester.id;

  if (!canAccessUser(requester, targetId)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await User.findByPk(targetId);
  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);

  const { name, email, password, phone, address } = req.body;

  await user.update({
    ...(name !== undefined ? { name } : {}),
    ...(email !== undefined ? { email } : {}),
    ...(password ? { password } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(address !== undefined ? { address } : {})
  });

  const updated = await User.findByPk(targetId, {
    attributes: publicAttributes,
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }]
  });

  return res.json(updated);
};

export const connections = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);

  if (requester.super) {
    const items = await Whatsapp.findAll({
      attributes: ["id", "name", "status", "number", "qrcode", "companyId"],
      include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
      order: [["companyId", "ASC"], ["name", "ASC"]]
    });
    return res.json(items);
  }

  if (!requester.whatsappId) return res.json([]);

  const item = await Whatsapp.findOne({
    where: { id: requester.whatsappId, companyId: requester.companyId },
    attributes: ["id", "name", "status", "number", "qrcode", "companyId"],
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }]
  });

  return res.json(item ? [item] : []);
};

const getAllowedWhatsapp = async (req: Request): Promise<{ requester: User; whatsapp: Whatsapp }> => {
  const requester = await getRequester(req);
  const whatsapp = await Whatsapp.findByPk(+req.params.whatsappId);
  if (!whatsapp) throw new AppError("ERR_NO_WAPP_FOUND", 404);

  const allowed = requester.super === true ||
    (requester.whatsappId === whatsapp.id && requester.companyId === whatsapp.companyId);

  if (!allowed) throw new AppError("ERR_NO_PERMISSION", 403);
  return { requester, whatsapp };
};

export const startConnection = async (req: Request, res: Response): Promise<Response> => {
  const { whatsapp } = await getAllowedWhatsapp(req);
  await whatsapp.update({ session: "", status: "OPENING" });
  void StartWhatsAppSession(whatsapp, whatsapp.companyId);
  return res.status(202).json({ message: "Starting session.", status: "OPENING" });
};

export const disconnectConnection = async (req: Request, res: Response): Promise<Response> => {
  const { whatsapp } = await getAllowedWhatsapp(req);

  try {
    const wbot = getWbot(whatsapp.id);
    await wbot.logout();
  } catch (err) {
    await removeWbot(whatsapp.id, false);
  }

  await whatsapp.update({ status: "DISCONNECTED", session: "", qrcode: "" });
  return res.json({ message: "Session disconnected." });
};
