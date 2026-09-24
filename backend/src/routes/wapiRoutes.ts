import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as WApiController from "../controllers/WApiController";

const routes = Router();

routes.get("/wapi/config", isAuth, WApiController.config);
routes.post("/wapi/connection/link", isAuth, WApiController.link);
routes.post("/wapi/connection/create", isAuth, WApiController.create);
routes.get("/wapi/connection/:connectionId/qr", isAuth, WApiController.qr);
routes.get("/wapi/connection/:connectionId/status", isAuth, WApiController.status);
routes.post("/wapi/connection/:connectionId/restart", isAuth, WApiController.restart);
routes.delete("/wapi/connection/:connectionId", isAuth, WApiController.disconnect);

export default routes;
