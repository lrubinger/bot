import express from "express";
import isAuth from "../middleware/isAuth";

import * as WhatsAppController from "../controllers/WhatsAppController";
import * as ProfileController from "../controllers/ProfileController";

const whatsappRoutes = express.Router();

// Settings drawer routes must come before /whatsapp/:whatsappId.
whatsappRoutes.get("/whatsapp/profile/connections", isAuth, ProfileController.connections);
whatsappRoutes.post("/whatsapp/profile/connections/:whatsappId/start", isAuth, ProfileController.startConnection);
whatsappRoutes.delete("/whatsapp/profile/connections/:whatsappId/disconnect", isAuth, ProfileController.disconnectConnection);

whatsappRoutes.get("/whatsapp/", isAuth, WhatsAppController.index);

whatsappRoutes.post("/whatsapp/", isAuth, WhatsAppController.store);

whatsappRoutes.get("/whatsapp/:whatsappId", isAuth, WhatsAppController.show);

whatsappRoutes.put("/whatsapp/:whatsappId", isAuth, WhatsAppController.update);

whatsappRoutes.delete(
  "/whatsapp/:whatsappId",
  isAuth,
  WhatsAppController.remove
);

export default whatsappRoutes;
