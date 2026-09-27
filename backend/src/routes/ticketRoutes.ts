import express from "express";
import isAuth from "../middleware/isAuth";

import * as TicketController from "../controllers/TicketController";

const ticketRoutes = express.Router();

ticketRoutes.get("/tickets", isAuth, TicketController.index);

ticketRoutes.get("/tickets/:ticketId", isAuth, TicketController.show);

ticketRoutes.get("/ticket/kanban", isAuth, TicketController.kanban);

ticketRoutes.get("/tickets/u/:uuid", isAuth, TicketController.showFromUUID);

ticketRoutes.post("/tickets", isAuth, TicketController.store);

ticketRoutes.put("/tickets/:ticketId", isAuth, TicketController.update);

ticketRoutes.post("/tickets/:ticketId/mark-unread", isAuth, TicketController.markUnread);
ticketRoutes.post("/tickets/:ticketId/archive", isAuth, TicketController.archive);
ticketRoutes.post("/tickets/:ticketId/unarchive", isAuth, TicketController.unarchive);

ticketRoutes.delete("/tickets/:ticketId", isAuth, TicketController.remove);

export default ticketRoutes;
