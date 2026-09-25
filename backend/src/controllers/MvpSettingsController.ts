import { Request, Response } from "express";
import AppError from "../errors/AppError";
import User from "../models/User";
import Company from "../models/Company";

const attrs = [
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

const requesterFrom = async (req: Request): Promise<User> => {
  const requester = await User.findByPk(req.user.id);
  if (!requester) throw new AppError("ERR_NO_USER_FOUND", 404);
  return requester;
};

const isMaster = (user: User): boolean =>
  user.super === true || String(user.email || "").toLowerCase() === "admin@portoplan.com.br";

const serialize = async (id: number) =>
  User.findByPk(id, {
    attributes: attrs,
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }]
  });

export const listUsers = async (req: Request, res: Response): Promise<Response> => {
  const requester = await requesterFrom(req);

  if (!isMaster(requester)) {
    const own = await serialize(requester.id);
    return res.json(own ? [own] : []);
  }

  const users = await User.findAll({
    attributes: attrs,
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
    order: [["name", "ASC"]]
  });

  return res.json(users);
};

export const showProfile = async (req: Request, res: Response): Promise<Response> => {
  const requester = await requesterFrom(req);
  const targetId = Number(req.params.userId || requester.id);

  if (!isMaster(requester) && targetId !== requester.id) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await serialize(targetId);
  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);
  return res.json(user);
};

export const updateProfile = async (req: Request, res: Response): Promise<Response> => {
  const requester = await requesterFrom(req);
  const targetId = Number(req.params.userId || requester.id);
  const master = isMaster(requester);

  if (!master && targetId !== requester.id) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await User.findByPk(targetId);
  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);

  const { name, email, phone, address, password, profile } = req.body || {};
  const patch: any = {};

  if (name !== undefined) patch.name = String(name).trim();
  if (email !== undefined) patch.email = String(email).trim();
  if (phone !== undefined) patch.phone = String(phone).trim();
  if (address !== undefined) patch.address = String(address).trim();
  if (password) patch.password = String(password);

  // Only PortoPlan master may change access level.
  if (master && profile !== undefined) {
    const allowedProfiles = ["admin", "user"];
    if (!allowedProfiles.includes(String(profile))) {
      throw new AppError("ERR_INVALID_PROFILE", 400);
    }
    patch.profile = String(profile);
  }

  await user.update(patch);

  const updated = await serialize(targetId);
  return res.json(updated);
};
