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
  "addressStreet",
  "addressNumber",
  "addressComplement",
  "addressCity",
  "addressState",
  "addressZipCode",
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

const canAccessUser = async (requester: User, targetId: number): Promise<boolean> => {
  if (requester.super === true || requester.id === targetId) return true;
  if (requester.profile !== "admin") return false;

  const target = await User.findByPk(targetId, { attributes: ["id", "companyId"] });
  return Boolean(target && target.companyId === requester.companyId);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);
  const targetId = req.params.userId ? +req.params.userId : requester.id;

  if (!(await canAccessUser(requester, targetId))) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await User.findByPk(targetId, {
    attributes: publicAttributes,
    include: [
      { model: Company, as: "company", attributes: ["id", "name", "phone", "email"] },
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name", "status", "qrcode"] }
    ]
  });

  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);
  return res.json(user);
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);

  if (requester.super) {
    const users = await User.findAll({
      attributes: publicAttributes,
      include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
      order: [["name", "ASC"]]
    });
    return res.json(users);
  }

  if (requester.profile === "admin") {
    const users = await User.findAll({
      where: { companyId: requester.companyId },
      attributes: publicAttributes,
      include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
      order: [["name", "ASC"]]
    });
    return res.json(users);
  }

  const current = await User.findByPk(requester.id, {
    attributes: publicAttributes,
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }]
  });
  return res.json([current]);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);
  const targetId = req.params.userId ? +req.params.userId : requester.id;

  if (!(await canAccessUser(requester, targetId))) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await User.findByPk(targetId);
  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);

  const {
    name,
    email,
    password,
    currentPassword,
    phone,
    address,
    addressStreet,
    addressNumber,
    addressComplement,
    addressCity,
    addressState,
    addressZipCode
  } = req.body;

  const emailChanged = email !== undefined && email !== user.email;
  const passwordChanged = Boolean(password);

  if (passwordChanged && String(password).length < 8) {
    throw new AppError("A nova senha deve ter no mínimo 8 caracteres.", 400);
  }

  if (emailChanged || passwordChanged) {
    if (!currentPassword || !(await requester.checkPassword(String(currentPassword)))) {
      throw new AppError("Senha atual inválida.", 403);
    }
  }

  const normalizedPhone = phone !== undefined ? String(phone).replace(/\D/g, "") : undefined;
  const normalizedZip = addressZipCode !== undefined ? String(addressZipCode).replace(/\D/g, "") : undefined;

  const legacyAddress = [
    addressStreet,
    addressNumber,
    addressComplement,
    addressCity,
    addressState,
    normalizedZip
  ].filter(value => value !== undefined && String(value).trim() !== "").join(", ");

  await user.update({
    ...(name !== undefined ? { name } : {}),
    ...(email !== undefined ? { email } : {}),
    ...(password ? { password } : {}),
    ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
    ...(addressStreet !== undefined ? { addressStreet } : {}),
    ...(addressNumber !== undefined ? { addressNumber } : {}),
    ...(addressComplement !== undefined ? { addressComplement } : {}),
    ...(addressCity !== undefined ? { addressCity } : {}),
    ...(addressState !== undefined ? { addressState: String(addressState).toUpperCase().slice(0, 2) } : {}),
    ...(normalizedZip !== undefined ? { addressZipCode: normalizedZip } : {}),
    ...(address !== undefined
      ? { address }
      : (addressStreet !== undefined ||
         addressNumber !== undefined ||
         addressComplement !== undefined ||
         addressCity !== undefined ||
         addressState !== undefined ||
         addressZipCode !== undefined)
        ? { address: legacyAddress }
        : {})
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
      attributes: ["id", "name", "status", "qrcode", "companyId", "provider", "wabaId", "phoneNumberId", "wapiInstanceId"],
      include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
      order: [["companyId", "ASC"], ["name", "ASC"]]
    });
    return res.json(items);
  }

  if (!requester.whatsappId) return res.json([]);

  const item = await Whatsapp.findOne({
    where: { id: requester.whatsappId, companyId: requester.companyId },
    attributes: ["id", "name", "status", "qrcode", "companyId", "provider", "wabaId", "phoneNumberId", "wapiInstanceId"],
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
