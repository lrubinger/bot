import { Request, Response } from "express";
import CompanyKanban from "../models/CompanyKanban";

const defaultData = () => ({
  columns: [
    { id: "new", title: "Novos", cards: [] },
    { id: "progress", title: "Em andamento", cards: [] },
    { id: "done", title: "Concluídos", cards: [] }
  ]
});

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  let board = await CompanyKanban.findOne({ where: { companyId } });
  if (!board) board = await CompanyKanban.create({ companyId, data: defaultData() } as any);
  return res.json(board.data || defaultData());
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body && Array.isArray(req.body.columns) ? req.body : defaultData();

  let board = await CompanyKanban.findOne({ where: { companyId } });
  if (!board) board = await CompanyKanban.create({ companyId, data } as any);
  else await board.update({ data });

  return res.json(board.data);
};
