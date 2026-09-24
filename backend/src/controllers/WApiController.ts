import { Request, Response } from "express";
import https from "https";
import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import User from "../models/User";

const baseUrl = process.env.WAPI_BASE_URL || "https://api.w-api.app/v1";

const requestJson = <T = any>(
  method: "GET" | "POST" | "DELETE",
  url: string,
  token: string,
  payload?: any
): Promise<T> =>
  new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = payload ? JSON.stringify(payload) : "";
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
              }
            : {})
        }
      },
      res => {
        let data = "";
        res.on("data", chunk => (data += chunk));
        res.on("end", () => {
          let parsedBody: any = data;
          try {
            parsedBody = data ? JSON.parse(data) : {};
          } catch (_) {}

          if ((res.statusCode || 500) >= 400) {
            return reject(
              new AppError(
                parsedBody?.message ||
                  parsedBody?.error ||
                  `W-API HTTP ${res.statusCode}`,
                502
              )
            );
          }

          return resolve(parsedBody as T);
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });

const getRequester = async (req: Request) => {
  const user = await User.findByPk(req.user.id);
  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);
  return user;
};

const getAllowedConnection = async (req: Request) => {
  const requester = await getRequester(req);
  const connection = await Whatsapp.findByPk(+req.params.connectionId);

  if (!connection) throw new AppError("ERR_NO_WAPP_FOUND", 404);

  const allowed =
    requester.super === true ||
    (requester.companyId === connection.companyId &&
      requester.whatsappId === connection.id);

  if (!allowed) throw new AppError("ERR_NO_PERMISSION", 403);
  if (connection.provider !== "w-api")
    throw new AppError("ERR_NOT_WAPI_CONNECTION", 400);
  if (!connection.wapiInstanceId || !connection.token)
    throw new AppError("ERR_WAPI_CREDENTIALS_MISSING", 400);

  return { requester, connection };
};

export const config = async (req: Request, res: Response): Promise<Response> =>
  res.json({
    enabled: true,
    canAutoCreate: Boolean(process.env.WAPI_INTEGRATOR_TOKEN),
    baseUrl
  });

export const link = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);
  const { instanceId, token, name } = req.body || {};

  if (!instanceId || !token)
    throw new AppError("WAPI_INSTANCE_AND_TOKEN_REQUIRED", 400);

  const status = await requestJson<any>(
    "GET",
    `${baseUrl}/instance/status-instance?instanceId=${encodeURIComponent(
      String(instanceId)
    )}`,
    String(token)
  );

  let connection = await Whatsapp.findOne({
    where: { companyId: requester.companyId, provider: "w-api" }
  });

  if (!connection) {
    connection = await Whatsapp.create({
      name: name || `WhatsApp ${requester.companyId}`,
      provider: "w-api",
      status: status.connected ? "CONNECTED" : "DISCONNECTED",
      companyId: requester.companyId,
      token: String(token),
      wapiInstanceId: String(instanceId),
      qrcode: ""
    } as any);
  } else {
    await connection.update({
      name: name || connection.name,
      token: String(token),
      wapiInstanceId: String(instanceId),
      status: status.connected ? "CONNECTED" : "DISCONNECTED"
    });
  }

  await requester.update({ whatsappId: connection.id });

  return res.json({
    id: connection.id,
    name: connection.name,
    provider: connection.provider,
    status: connection.status,
    wapiInstanceId: connection.wapiInstanceId
  });
};

export const create = async (req: Request, res: Response): Promise<Response> => {
  const requester = await getRequester(req);
  const integratorToken = process.env.WAPI_INTEGRATOR_TOKEN;
  if (!integratorToken)
    throw new AppError("WAPI_INTEGRATOR_TOKEN_NOT_CONFIGURED", 503);

  const name = String(req.body?.name || `PortoPlan - ${requester.companyId}`);

  const created = await requestJson<any>(
    "POST",
    `${baseUrl}/integrator/create-instance`,
    integratorToken,
    {
      instanceName: name,
      rejectCalls: true,
      callMessage: "No momento não atendemos ligações por este número."
    }
  );

  if (!created?.instanceId || !created?.token)
    throw new AppError("WAPI_INSTANCE_CREATION_FAILED", 502);

  req.body = {
    instanceId: created.instanceId,
    token: created.token,
    name
  };
  return link(req, res);
};

export const qr = async (req: Request, res: Response): Promise<Response> => {
  const { connection } = await getAllowedConnection(req);
  const data = await requestJson<any>(
    "GET",
    `${baseUrl}/instance/qr-code?instanceId=${encodeURIComponent(
      connection.wapiInstanceId
    )}&syncContacts=disable&image=enable`,
    connection.token
  );

  if (data?.qrcode) {
    await connection.update({ qrcode: data.qrcode, status: "QRCODE" });
  }

  return res.json({
    instanceId: connection.wapiInstanceId,
    qrcode: data?.qrcode || "",
    error: Boolean(data?.error)
  });
};

export const status = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { connection } = await getAllowedConnection(req);
  const data = await requestJson<any>(
    "GET",
    `${baseUrl}/instance/status-instance?instanceId=${encodeURIComponent(
      connection.wapiInstanceId
    )}`,
    connection.token
  );

  const nextStatus = data?.connected ? "CONNECTED" : "DISCONNECTED";
  if (connection.status !== nextStatus) {
    await connection.update({ status: nextStatus });
  }

  return res.json({
    instanceId: connection.wapiInstanceId,
    connected: Boolean(data?.connected),
    status: nextStatus
  });
};

export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { connection } = await getAllowedConnection(req);
  const data = await requestJson<any>(
    "GET",
    `${baseUrl}/instance/restart?instanceId=${encodeURIComponent(
      connection.wapiInstanceId
    )}`,
    connection.token
  );
  return res.json(data);
};

export const disconnect = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { connection } = await getAllowedConnection(req);
  const data = await requestJson<any>(
    "GET",
    `${baseUrl}/instance/disconnect?instanceId=${encodeURIComponent(
      connection.wapiInstanceId
    )}`,
    connection.token
  );

  await connection.update({ status: "DISCONNECTED", qrcode: "" });
  return res.json(data);
};
