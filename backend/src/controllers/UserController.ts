import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import sequelize from "../database";
import { QueryTypes } from "sequelize";

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
  const requester = await (await import("../models/User")).default.findByPk(+req.user.id);
  if (!requester) throw new AppError("ERR_NO_USER_FOUND", 404);

  const { users, count, hasMore } = await ListUsersService({
    searchParam,
    pageNumber,
    companyId: requester.super === true ? undefined : companyId,
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

  const rows = await sequelize.query(
    `SELECT "phone", "address", "addressStreet", "addressNumber",
            "addressComplement", "addressCity", "addressState", "addressZipCode"
       FROM "Users"
      WHERE "id" = :userId
      LIMIT 1`,
    {
      replacements: { userId: +userId },
      type: QueryTypes.SELECT
    }
  ) as any[];

  return res.status(200).json({
    ...(user.toJSON() as any),
    ...(rows[0] || {})
  });
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
    requester.super === true;
  const isSelf = +requestUserId === +userId;
  const sameCompany = requester.companyId === target.companyId;

  if (!isMaster && !isSelf && !(requester.profile === "admin" && sameCompany)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const userData = { ...req.body };
  const emailChanged =
    userData.email !== undefined &&
    String(userData.email).trim().toLowerCase() !== String(target.email || "").trim().toLowerCase();
  const passwordChanged = Boolean(userData.password);

  if (passwordChanged && String(userData.password).length < 8) {
    throw new AppError("A nova senha deve ter no mínimo 8 caracteres.", 400);
  }

  if (isSelf && (emailChanged || passwordChanged)) {
    const currentPassword = String(userData.currentPassword || "");
    if (!currentPassword || !(await requester.checkPassword(currentPassword))) {
      throw new AppError("Senha atual inválida.", 403);
    }
  }

  delete userData.currentPassword;

  if (userData.phone !== undefined) {
    userData.phone = String(userData.phone).replace(/\D/g, "");
  }
  if (userData.addressZipCode !== undefined) {
    userData.addressZipCode = String(userData.addressZipCode).replace(/\D/g, "");
  }
  if (userData.addressState !== undefined) {
    userData.addressState = String(userData.addressState).toUpperCase().slice(0, 2);
  }

  if (
    userData.addressStreet !== undefined ||
    userData.addressNumber !== undefined ||
    userData.addressComplement !== undefined ||
    userData.addressCity !== undefined ||
    userData.addressState !== undefined ||
    userData.addressZipCode !== undefined
  ) {
    userData.address = [
      userData.addressStreet,
      userData.addressNumber,
      userData.addressComplement,
      userData.addressCity,
      userData.addressState,
      userData.addressZipCode
    ]
      .filter(value => value !== undefined && String(value).trim() !== "")
      .join(", ");
  }

  if (userData.active !== undefined && isSelf && userData.active === false) {
    throw new AppError("Não é possível bloquear o próprio acesso.", 400);
  }

  if (userData.profile !== undefined) {
    const allowedProfiles = ["admin", "user"];
    if (!allowedProfiles.includes(String(userData.profile))) {
      throw new AppError("ERR_INVALID_PROFILE", 400);
    }

    const mayChangeProfile =
      isMaster || (requester.profile === "admin" && sameCompany && !target.super);

    if (!mayChangeProfile) delete userData.profile;
  }

  // Somente o superusuário pode mover usuários entre empresas.
  if (!isMaster) {
    delete userData.companyId;
  }

  const user = await UpdateUserService({
    userData,
    userId,
    companyId,
    requestUserId: +requestUserId
  });

  const hasProfileFields =
    userData.phone !== undefined ||
    userData.address !== undefined ||
    userData.addressStreet !== undefined ||
    userData.addressNumber !== undefined ||
    userData.addressComplement !== undefined ||
    userData.addressCity !== undefined ||
    userData.addressState !== undefined ||
    userData.addressZipCode !== undefined;

  let persistedProfile: any = {};

  if (hasProfileFields) {
    const [, metadata]: any = await sequelize.query(
      `UPDATE "Users"
          SET "phone" = COALESCE(:phone, "phone"),
              "address" = COALESCE(:address, "address"),
              "addressStreet" = COALESCE(:addressStreet, "addressStreet"),
              "addressNumber" = COALESCE(:addressNumber, "addressNumber"),
              "addressComplement" = COALESCE(:addressComplement, "addressComplement"),
              "addressCity" = COALESCE(:addressCity, "addressCity"),
              "addressState" = COALESCE(:addressState, "addressState"),
              "addressZipCode" = COALESCE(:addressZipCode, "addressZipCode"),
              "updatedAt" = NOW()
        WHERE "id" = :userId
        RETURNING "phone", "address", "addressStreet", "addressNumber",
                  "addressComplement", "addressCity", "addressState", "addressZipCode"`,
      {
        replacements: {
          userId: +userId,
          phone: userData.phone !== undefined ? userData.phone : null,
          address: userData.address !== undefined ? userData.address : null,
          addressStreet: userData.addressStreet !== undefined ? userData.addressStreet : null,
          addressNumber: userData.addressNumber !== undefined ? userData.addressNumber : null,
          addressComplement: userData.addressComplement !== undefined ? userData.addressComplement : null,
          addressCity: userData.addressCity !== undefined ? userData.addressCity : null,
          addressState: userData.addressState !== undefined ? userData.addressState : null,
          addressZipCode: userData.addressZipCode !== undefined ? userData.addressZipCode : null
        }
      }
    );

    const returnedRows = Array.isArray(metadata?.rows)
      ? metadata.rows
      : Array.isArray(metadata)
        ? metadata
        : [];

    if (returnedRows.length) {
      persistedProfile = returnedRows[0];
    } else {
      const verifyRows = await sequelize.query(
        `SELECT "phone", "address", "addressStreet", "addressNumber",
                "addressComplement", "addressCity", "addressState", "addressZipCode"
           FROM "Users"
          WHERE "id" = :userId
          LIMIT 1`,
        {
          replacements: { userId: +userId },
          type: QueryTypes.SELECT
        }
      ) as any[];
      persistedProfile = verifyRows[0] || {};
    }

    const expectedChecks: Array<[string, any]> = [
      ["phone", userData.phone],
      ["addressStreet", userData.addressStreet],
      ["addressNumber", userData.addressNumber],
      ["addressComplement", userData.addressComplement],
      ["addressCity", userData.addressCity],
      ["addressState", userData.addressState],
      ["addressZipCode", userData.addressZipCode]
    ];

    const failed = expectedChecks.find(([key, expected]) =>
      expected !== undefined && String(persistedProfile[key] ?? "") !== String(expected ?? "")
    );

    if (failed) {
      throw new AppError("Os dados do perfil não foram persistidos corretamente. Tente novamente.", 500);
    }
  } else {
    const verifyRows = await sequelize.query(
      `SELECT "phone", "address", "addressStreet", "addressNumber",
              "addressComplement", "addressCity", "addressState", "addressZipCode"
         FROM "Users"
        WHERE "id" = :userId
        LIMIT 1`,
      {
        replacements: { userId: +userId },
        type: QueryTypes.SELECT
      }
    ) as any[];
    persistedProfile = verifyRows[0] || {};
  }

  const responseUser = {
    ...(user as any),
    ...persistedProfile
  };

  const io = getIO();
  io.emit(`company-${target.companyId}-user`, {
    action: "update",
    user: responseUser
  });

  return res.status(200).json(responseUser);
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
