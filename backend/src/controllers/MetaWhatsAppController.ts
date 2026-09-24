import { Request, Response } from "express";
import https from "https";
import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import User from "../models/User";

const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";

const graphRequest = <T = any>(
  method: "GET" | "POST",
  path: string,
  params: Record<string, string>,
  token?: string
): Promise<T> =>
  new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const options: https.RequestOptions = {
      hostname: "graph.facebook.com",
      port: 443,
      path: `/${graphVersion}${path}${method === "GET" && body ? `?${body}` : ""}`,
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(method === "POST"
          ? {
              "Content-Type": "application/x-www-form-urlencoded",
              "Content-Length": Buffer.byteLength(body)
            }
          : {})
      }
    };

    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        let parsed: any = data;
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch (_) {}

        if ((res.statusCode || 500) >= 400) {
          const message =
            parsed?.error?.message ||
            parsed?.message ||
            `Meta Graph API HTTP ${res.statusCode}`;
          return reject(new AppError(message, 502));
        }

        return resolve(parsed as T);
      });
    });

    req.on("error", reject);
    if (method === "POST" && body) req.write(body);
    req.end();
  });

const requireMetaConfig = () => {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID;

  if (!appId || !appSecret || !configId) {
    throw new AppError("META_WHATSAPP_NOT_CONFIGURED", 503);
  }

  return { appId, appSecret, configId };
};

export const config = async (req: Request, res: Response): Promise<Response> => {
  const appId = process.env.META_APP_ID || "";
  const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || "";

  return res.json({
    enabled: Boolean(appId && configId && process.env.META_APP_SECRET),
    appId,
    configId,
    graphVersion,
    coexistence: true
  });
};

export const complete = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const requester = await User.findByPk(userId);
  if (!requester) throw new AppError("ERR_NO_USER_FOUND", 404);

  const { code, wabaId, phoneNumberId, businessId } = req.body || {};
  if (!code) throw new AppError("META_AUTH_CODE_REQUIRED", 400);

  const { appId, appSecret } = requireMetaConfig();

  const tokenData = await graphRequest<{ access_token: string }>(
    "GET",
    "/oauth/access_token",
    {
      client_id: appId,
      client_secret: appSecret,
      code: String(code)
    }
  );

  if (!tokenData.access_token) {
    throw new AppError("META_ACCESS_TOKEN_NOT_RETURNED", 502);
  }

  let resolvedWabaId = wabaId ? String(wabaId) : "";
  let resolvedPhoneNumberId = phoneNumberId ? String(phoneNumberId) : "";

  if (resolvedWabaId) {
    await graphRequest(
      "POST",
      `/${resolvedWabaId}/subscribed_apps`,
      {},
      tokenData.access_token
    );

    if (!resolvedPhoneNumberId) {
      const phones = await graphRequest<{ data?: Array<{ id: string }> }>(
        "GET",
        `/${resolvedWabaId}/phone_numbers`,
        {},
        tokenData.access_token
      );
      resolvedPhoneNumberId = phones.data?.[0]?.id || "";
    }
  }

  let connection = await Whatsapp.findOne({
    where: { companyId, provider: "meta-cloud" }
  });

  if (!connection) {
    connection = await Whatsapp.create({
      name: `WhatsApp Cloud ${companyId}`,
      provider: "meta-cloud",
      status: "CONNECTED",
      companyId,
      token: tokenData.access_token,
      qrcode: "",
      wabaId: resolvedWabaId || null,
      phoneNumberId: resolvedPhoneNumberId || null,
      metaBusinessId: businessId ? String(businessId) : null
    } as any);
  } else {
    await connection.update({
      status: "CONNECTED",
      token: tokenData.access_token,
      qrcode: "",
      wabaId: resolvedWabaId || connection.wabaId,
      phoneNumberId: resolvedPhoneNumberId || connection.phoneNumberId,
      metaBusinessId: businessId
        ? String(businessId)
        : connection.metaBusinessId
    });
  }

  await requester.update({ whatsappId: connection.id });

  return res.json({
    success: true,
    connection: {
      id: connection.id,
      name: connection.name,
      provider: connection.provider,
      status: connection.status,
      wabaId: connection.wabaId,
      phoneNumberId: connection.phoneNumberId
    }
  });
};

export const webhookVerify = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const mode = req.query["hub.mode"];
  const verifyToken = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    verifyToken &&
    verifyToken === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return res.status(200).send(String(challenge || ""));
  }

  return res.sendStatus(403);
};

export const webhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  // Acknowledge immediately. Message ingestion will be wired into the
  // existing ticket pipeline after the official connection is validated.
  return res.sendStatus(200);
};
