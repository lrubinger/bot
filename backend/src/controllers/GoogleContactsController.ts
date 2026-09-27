import https from "https";
import { URL, URLSearchParams } from "url";
import { Request, Response } from "express";
import { sign, verify } from "jsonwebtoken";
import { Op } from "sequelize";

import Contact from "../models/Contact";
import ContactCustomField from "../models/ContactCustomField";
import AppError from "../errors/AppError";
import authConfig from "../config/auth";

const GOOGLE_SCOPE = "https://www.googleapis.com/auth/contacts.readonly";

const clean = (value: any): string => String(value == null ? "" : value).trim();

const normalizePhone = (value: any): string =>
  clean(value).replace(/\D/g, "");

const getCompany = async (contactId: number): Promise<string> => {
  const field = await ContactCustomField.findOne({
    where: { contactId, name: "Empresa" }
  });
  return field?.value || "";
};

const setCompany = async (contactId: number, companyName: string): Promise<void> => {
  const value = clean(companyName);
  const existing = await ContactCustomField.findOne({
    where: { contactId, name: "Empresa" }
  });

  if (!value) {
    if (existing) await existing.destroy();
    return;
  }

  if (existing) {
    await existing.update({ value });
  } else {
    await ContactCustomField.create({
      contactId,
      name: "Empresa",
      value
    } as any);
  }
};

const requestRaw = (
  urlString: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: options.method || "GET",
        headers: options.headers || {}
      },
      response => {
        let data = "";
        response.on("data", chunk => {
          data += chunk;
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode || 500,
            body: data
          });
        });
      }
    );

    req.on("error", reject);

    if (options.body) req.write(options.body);
    req.end();
  });

const requestJson = async (
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<any> => {
  const response = await requestRaw(url, options);
  let parsed: any = null;

  try {
    parsed = response.body ? JSON.parse(response.body) : null;
  } catch (_) {
    parsed = response.body;
  }

  if (response.status < 200 || response.status >= 300) {
    const message =
      parsed?.error_description ||
      parsed?.error?.message ||
      parsed?.error ||
      `HTTP ${response.status}`;
    throw new Error(String(message));
  }

  return parsed;
};

const requiredGoogleConfig = () => {
  const clientId = clean(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = clean(process.env.GOOGLE_CLIENT_SECRET);
  const redirectUri =
    clean(process.env.GOOGLE_CONTACTS_REDIRECT_URI) ||
    `${clean(process.env.FRONTEND_URL).replace(/\/$/, "")}/api/google/contacts/callback`;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new AppError(
      "Integração Google Contacts ainda não configurada no servidor.",
      503
    );
  }

  return { clientId, clientSecret, redirectUri };
};

const getPrimaryName = (person: any): string => {
  const primary = (person?.names || []).find((item: any) => item?.metadata?.primary) ||
    person?.names?.[0];

  return clean(
    primary?.displayName ||
    [primary?.givenName, primary?.middleName, primary?.familyName]
      .map(clean)
      .filter(Boolean)
      .join(" ")
  );
};

const getPrimaryEmail = (person: any): string => {
  const primary =
    (person?.emailAddresses || []).find((item: any) => item?.metadata?.primary) ||
    person?.emailAddresses?.[0];
  return clean(primary?.value);
};

const getPrimaryPhone = (person: any): string => {
  const primary =
    (person?.phoneNumbers || []).find((item: any) => item?.metadata?.primary) ||
    person?.phoneNumbers?.[0];
  return normalizePhone(primary?.value);
};

const getPrimaryCompany = (person: any): string => {
  const primary =
    (person?.organizations || []).find((item: any) => item?.metadata?.primary) ||
    person?.organizations?.[0];
  return clean(primary?.name);
};

const importPerson = async (
  companyId: number,
  person: any
): Promise<"created" | "updated" | "ignored"> => {
  const name = getPrimaryName(person);
  const email = getPrimaryEmail(person);
  const number = getPrimaryPhone(person);
  const company = getPrimaryCompany(person);

  if (!name || !number) return "ignored";

  let contact = await Contact.findOne({
    where: { companyId, number }
  });

  if (!contact && email) {
    contact = await Contact.findOne({
      where: {
        companyId,
        email: { [Op.iLike]: email }
      }
    });
  }

  if (!contact) {
    contact = await Contact.create({
      name,
      email,
      number,
      companyId
    } as any);

    await setCompany(contact.id, company);
    return "created";
  }

  const currentCompany = await getCompany(contact.id);
  const sameData =
    clean(contact.name) === name &&
    clean(contact.email).toLowerCase() === email.toLowerCase() &&
    normalizePhone(contact.number) === number &&
    clean(currentCompany) === company;

  if (sameData) return "ignored";

  await contact.update({ name, email, number });
  await setCompany(contact.id, company);
  return "updated";
};

export const authUrl = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { clientId, redirectUri } = requiredGoogleConfig();

  const state = sign(
    {
      purpose: "google-contacts-import",
      userId: +req.user.id,
      companyId: +req.user.companyId
    },
    authConfig.secret,
    { expiresIn: "10m" }
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPE,
    access_type: "online",
    include_granted_scopes: "true",
    prompt: "consent",
    state
  });

  return res.json({
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  });
};

export const callback = async (
  req: Request,
  res: Response
): Promise<void> => {
  const frontendUrl = clean(process.env.FRONTEND_URL || "https://bot.portoplan.com.br").replace(/\/$/, "");
  const { clientId, clientSecret, redirectUri } = requiredGoogleConfig();

  const error = clean(req.query.error);
  if (error) {
    res.redirect(
      `${frontendUrl}/?googleContacts=error&message=${encodeURIComponent(error)}`
    );
    return;
  }

  const code = clean(req.query.code);
  const state = clean(req.query.state);

  if (!code || !state) {
    res.redirect(
      `${frontendUrl}/?googleContacts=error&message=${encodeURIComponent("Autorização incompleta.")}`
    );
    return;
  }

  let payload: any;
  try {
    payload = verify(state, authConfig.secret);
  } catch (_) {
    res.redirect(
      `${frontendUrl}/?googleContacts=error&message=${encodeURIComponent("Autorização expirada ou inválida.")}`
    );
    return;
  }

  if (payload?.purpose !== "google-contacts-import" || !payload?.companyId) {
    res.redirect(
      `${frontendUrl}/?googleContacts=error&message=${encodeURIComponent("Autorização inválida.")}`
    );
    return;
  }

  try {
    const tokenBody = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    }).toString();

    const token = await requestJson("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": String(Buffer.byteLength(tokenBody))
      },
      body: tokenBody
    });

    if (!token?.access_token) {
      throw new Error("Google não retornou um token de acesso.");
    }

    let pageToken = "";
    let created = 0;
    let updated = 0;
    let ignored = 0;

    do {
      const params = new URLSearchParams({
        personFields: "names,emailAddresses,phoneNumbers,organizations",
        pageSize: "1000",
        sortOrder: "FIRST_NAME_ASCENDING"
      });

      if (pageToken) params.set("pageToken", pageToken);

      const data = await requestJson(
        `https://people.googleapis.com/v1/people/me/connections?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token.access_token}`
          }
        }
      );

      for (const person of data?.connections || []) {
        try {
          const result = await importPerson(+payload.companyId, person);
          if (result === "created") created += 1;
          if (result === "updated") updated += 1;
          if (result === "ignored") ignored += 1;
        } catch (_) {
          ignored += 1;
        }
      }

      pageToken = clean(data?.nextPageToken);
    } while (pageToken);

    res.redirect(
      `${frontendUrl}/?googleContacts=success&created=${created}&updated=${updated}&ignored=${ignored}`
    );
    return;
  } catch (err: any) {
    res.redirect(
      `${frontendUrl}/?googleContacts=error&message=${encodeURIComponent(
        err?.message || "Não foi possível importar os contatos do Google."
      )}`
    );
    return;
  }
};
