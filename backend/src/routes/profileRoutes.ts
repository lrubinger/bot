import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as ProfileController from "../controllers/ProfileController";

const profileRoutes = Router();

profileRoutes.get("/profile/users", isAuth, ProfileController.list);
profileRoutes.get("/profile/users/:userId", isAuth, ProfileController.show);
profileRoutes.put("/profile/users/:userId", isAuth, ProfileController.update);
profileRoutes.get("/profile/connections", isAuth, ProfileController.connections);
profileRoutes.post("/profile/connections/:whatsappId/start", isAuth, ProfileController.startConnection);
profileRoutes.delete("/profile/connections/:whatsappId/disconnect", isAuth, ProfileController.disconnectConnection);

export default profileRoutes;
