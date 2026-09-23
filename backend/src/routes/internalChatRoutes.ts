import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as InternalChatController from "../controllers/InternalChatController";

const internalChatRoutes = Router();
internalChatRoutes.get("/internal-chat/contacts", isAuth, InternalChatController.contacts);
internalChatRoutes.get("/internal-chat/messages/:userId", isAuth, InternalChatController.messages);
internalChatRoutes.post("/internal-chat/messages/:userId", isAuth, InternalChatController.send);

export default internalChatRoutes;
