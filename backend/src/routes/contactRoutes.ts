import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as ContactController from "../controllers/ContactController";
import * as ImportPhoneContactsController from "../controllers/ImportPhoneContactsController";
import * as ContactCsvController from "../controllers/ContactCsvController";
import * as GoogleContactsController from "../controllers/GoogleContactsController";

const contactRoutes = express.Router();
const upload = multer(uploadConfig);

contactRoutes.get(
  "/google/contacts/auth-url",
  isAuth,
  GoogleContactsController.authUrl
);

contactRoutes.get(
  "/google/contacts/callback",
  GoogleContactsController.callback
);

contactRoutes.post(
  "/contacts/import",
  isAuth,
  ImportPhoneContactsController.store
);

contactRoutes.post(
  "/contacts/import-csv",
  isAuth,
  upload.single("file"),
  ContactCsvController.importCsv
);

contactRoutes.get(
  "/contacts/export-csv",
  isAuth,
  ContactCsvController.exportCsv
);

contactRoutes.put(
  "/contacts/:contactId/basic",
  isAuth,
  ContactCsvController.updateBasic
);

contactRoutes.get("/contacts", isAuth, ContactController.index);

contactRoutes.get("/contacts/list", isAuth, ContactController.list);

contactRoutes.get("/contacts/:contactId", isAuth, ContactController.show);

contactRoutes.post(
  "/contacts/:contactId/start-conversation",
  isAuth,
  ContactController.startConversation
);

contactRoutes.post("/contacts", isAuth, ContactController.store);

contactRoutes.put("/contacts/:contactId", isAuth, ContactController.update);

contactRoutes.delete("/contacts/:contactId", isAuth, ContactController.remove);

export default contactRoutes;
