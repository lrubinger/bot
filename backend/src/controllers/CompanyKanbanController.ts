import { Request, Response } from "express";
import Setting from "../models/Setting";

const KEY = "portoplanMvpKanban";

const defaultData = () => ({
  columns: [
    { id: "new", title: "Novos", cards: [] },
    { id: "progress", title: "Em andamento", cards: [] },
    { id: "done", title: "Concluídos", cards: [] }
  ]
});

const readBoard = async (companyId: number) => {
  const setting = await Setting.findOne({ where: { companyId, key: KEY } });
  if (!setting || !setting.value) return defaultData();

  try {
    const parsed = JSON.parse(setting.value);
    return parsed && Array.isArray(parsed.columns) ? parsed : defaultData();
  } catch (_) {
    return defaultData();
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const board = await readBoard(companyId);
  return res.json(board);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data =
    req.body && Array.isArray(req.body.columns) ? req.body : defaultData();

  const [setting] = await Setting.findOrCreate({
    where: { companyId, key: KEY },
    defaults: {
      companyId,
      key: KEY,
      value: JSON.stringify(data)
    }
  });

  await setting.update({ value: JSON.stringify(data) });
  return res.json(data);
};
