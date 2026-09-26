import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CheckSettingsHelper from "../helpers/CheckSettings";
import AppError from "../errors/AppError";

import CreateUserService from "../services/UserServices/CreateUserService";
import ListUsersService from "../services/UserServices/ListUsersService";
import UpdateUserService from "../services/UserServices/UpdateUserService";
import ShowUserService from "../services/UserServices/ShowUserService";
import DeleteUserService from "../services/UserServices/DeleteUserService";
import SimpleListService from "../services/UserServices/SimpleListService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

type ListQueryParams = {
  companyId: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId, profile } = req.user;

  const { users, count, hasMore } = await ListUsersService({
    searchParam,
    pageNumber,
    companyId,
    profile
  });

  return res.json({ users, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    email,
    password,
    name,
    profile,
    companyId: bodyCompanyId,
    queueIds,
    whatsappId,
    phone
  } = req.body;
  let userCompanyId: number | null = null;
  let requestedProfile = profile;

  if (req.user !== undefined) {
    const requester = await (await import("../models/User")).default.findByPk(+req.user.id);
    if (!requester) throw new AppError("ERR_NO_USER_FOUND", 404);

    if (requester.super === true) {
      userCompanyId = bodyCompanyId || requester.companyId;
    } else {
      userCompanyId = requester.companyId;
      requestedProfile = "user";
    }
  }

  if (
    req.url === "/signup" &&
    (await CheckSettingsHelper("userCreation")) === "disabled"
  ) {
    throw new AppError("ERR_USER_CREATION_DISABLED", 403);
  } else if (req.url !== "/signup" && req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await CreateUserService({
    email,
    password,
    name,
    profile: requestedProfile,
    companyId: userCompanyId,
    queueIds,
    whatsappId,
    phone
  });

  const io = getIO();
  io.emit(`company-${userCompanyId}-user`, {
    action: "create",
    user
  });

  return res.status(200).json(user);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.params;

  const user = await ShowUserService(userId);

  return res.status(200).json(user);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id: requestUserId, companyId } = req.user;
  const { userId } = req.params;
  const requester = await (await import("../models/User")).default.findByPk(+requestUserId);
  const target = await (await import("../models/User")).default.findByPk(+userId);

  if (!requester || !target) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  const isMaster =
    requester.super === true ||
    String(requester.email || "").toLowerCase() === "admin@portoplan.com.br";
  const isSelf = +requestUserId === +userId;
  const sameCompany = requester.companyId === target.companyId;

  if (!isMaster && !isSelf && !(requester.profile === "admin" && sameCompany)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const userData = { ...req.body };

  // Only PortoPlan master may change access level.
  if (!isMaster) {
    delete userData.profile;
    delete userData.companyId;
  }

  const user = await UpdateUserService({
    userData,
    userId,
    companyId,
    requestUserId: +requestUserId
  });

  const io = getIO();
  io.emit(`company-${target.companyId}-user`, {
    action: "update",
    user
  });

  return res.status(200).json(user);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const requester = await (await import("../models/User")).default.findByPk(+req.user.id);
  const target = await (await import("../models/User")).default.findByPk(+userId);

  if (!requester || !target) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  const isMaster = requester.super === true;
  const sameCompany = requester.companyId === target.companyId;

  if (!isMaster && !(requester.profile === "admin" && sameCompany)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (requester.id === target.id) {
    throw new AppError("Não é possível excluir o próprio usuário.", 400);
  }

  await DeleteUserService(userId, target.companyId);

  const io = getIO();
  io.emit(`company-${target.companyId}-user`, {
    action: "delete",
    userId
  });

  return res.status(200).json({ message: "User deleted" });
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.query;
  const { companyId: userCompanyId } = req.user;

  const users = await SimpleListService({
    companyId: companyId ? +companyId : userCompanyId
  });

  return res.status(200).json(users);
};
