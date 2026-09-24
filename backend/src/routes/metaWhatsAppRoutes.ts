import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as MetaWhatsAppController from "../controllers/MetaWhatsAppController";

const routes = Router();

routes.get("/meta/whatsapp/config", isAuth, MetaWhatsAppController.config);
routes.post("/meta/whatsapp/complete", isAuth, MetaWhatsAppController.complete);
routes.get("/meta/whatsapp/webhook", MetaWhatsAppController.webhookVerify);
routes.post("/meta/whatsapp/webhook", MetaWhatsAppController.webhook);

export default routes;
