import fs from "fs";
import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { Op } from "sequelize";
import Contact from "../models/Contact";
import ContactCustomField from "../models/ContactCustomField";
import AppError from "../errors/AppError";

const GOOGLE_CONTACT_COLUMNS = [
  "First Name",
  "Middle Name",
  "Last Name",
  "Phonetic First Name",
  "Phonetic Middle Name",
  "Phonetic Last Name",
  "Name Prefix",
  "Name Suffix",
  "Nickname",
  "File As",
  "Organization Name",
  "Organization Title",
  "Organization Department",
  "Birthday",
  "Notes",
  "Photo",
  "Labels",
  "E-mail 1 - Label",
  "E-mail 1 - Value",
  "Phone 1 - Label",
  "Phone 1 - Value"
];

const clean = (value: any): string => String(value == null ? "" : value).trim();

const normalizePhone = (value: any): string => {
  const first = clean(value).split(":::")[0].trim();
  return first.replace(/\D/g, "");
};

const contactName = (row: any): string =>
  [row["First Name"], row["Middle Name"], row["Last Name"]]
    .map(clean)
    .filter(Boolean)
    .join(" ")
    .trim();

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

export const importCsv = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const file = req.file as Express.Multer.File;

  if (!file) throw new AppError("Selecione um arquivo CSV.", 400);

  try {
    const workbook = XLSX.readFile(file.path, { raw: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

    let created = 0;
    let updated = 0;
    let ignored = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const name = contactName(row);
      const company = clean(row["Organization Name"]);
      const email = clean(row["E-mail 1 - Value"]);
      const number = normalizePhone(row["Phone 1 - Value"]);

      if (!name || !number) {
        ignored += 1;
        errors.push({
          row: index + 2,
          message: !name ? "Nome não informado." : "Telefone não informado."
        });
        continue;
      }

      try {
        let contact = await Contact.findOne({ where: { companyId, number } });

        if (contact) {
          await contact.update({ name, email });
          await setCompany(contact.id, company);
          updated += 1;
        } else {
          contact = await Contact.create({
            name,
            number,
            email,
            companyId
          } as any);
          await setCompany(contact.id, company);
          created += 1;
        }
      } catch (err: any) {
        ignored += 1;
        errors.push({
          row: index + 2,
          message: err?.message || "Não foi possível importar este contato."
        });
      }
    }

    return res.status(200).json({
      created,
      updated,
      ignored,
      total: rows.length,
      errors: errors.slice(0, 50)
    });
  } finally {
    try {
      if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (_) {}
  }
};

export const exportCsv = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const contacts = await Contact.findAll({
    where: {
      companyId,
      isGroup: { [Op.ne]: true }
    },
    order: [["name", "ASC"]]
  });

  const rows = await Promise.all(
    contacts.map(async contact => {
      const row: any = {};
      GOOGLE_CONTACT_COLUMNS.forEach(column => {
        row[column] = "";
      });

      row["First Name"] = contact.name || "";
      row["Organization Name"] = await getCompany(contact.id);
      row["E-mail 1 - Label"] = contact.email ? "Home" : "";
      row["E-mail 1 - Value"] = contact.email || "";
      row["Phone 1 - Label"] = contact.number ? "Mobile" : "";
      row["Phone 1 - Value"] = contact.number ? `+${String(contact.number).replace(/\D/g, "")}` : "";
      return row;
    })
  );

  const sheet = XLSX.utils.json_to_sheet(rows, { header: GOOGLE_CONTACT_COLUMNS });
  const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ",", RS: "\n" });

  const fileName = `contatos-portoplan-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  return res.status(200).send("\uFEFF" + csv);
};
