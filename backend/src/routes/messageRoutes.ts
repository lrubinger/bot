import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";
import tokenAuth from "../middleware/tokenAuth";

import * as MessageController from "../controllers/MessageController";

const messageRoutes = Router();

const upload = multer(uploadConfig);

messageRoutes.get("/messages/:messageId/media", isAuth, MessageController.media);
messageRoutes.get("/messages/:ticketId/pending", isAuth, MessageController.pending);
messageRoutes.post("/messages/:messageId/pending", isAuth, MessageController.setPending);
messageRoutes.post("/messages/:messageId/react", isAuth, MessageController.react);
messageRoutes.post("/messages/:messageId/forward", isAuth, MessageController.forward);
messageRoutes.get("/messages/:ticketId", isAuth, MessageController.index);
messageRoutes.post("/messages/:ticketId", isAuth, upload.array("medias"), MessageController.store);
messageRoutes.delete("/messages/:messageId", isAuth, MessageController.remove);
messageRoutes.post("/api/messages/send", tokenAuth, upload.array("medias"), MessageController.send);

export default messageRoutes;
