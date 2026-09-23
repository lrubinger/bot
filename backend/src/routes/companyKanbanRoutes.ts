import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as CompanyKanbanController from "../controllers/CompanyKanbanController";

const companyKanbanRoutes = Router();
companyKanbanRoutes.get("/company-kanban", isAuth, CompanyKanbanController.show);
companyKanbanRoutes.put("/company-kanban", isAuth, CompanyKanbanController.update);

export default companyKanbanRoutes;
