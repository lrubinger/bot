import { Router } from "express";
import * as SessionController from "../controllers/SessionController";
import * as UserController from "../controllers/UserController";
import isAuth from "../middleware/isAuth";
import envTokenAuth from "../middleware/envTokenAuth";
import * as MvpSettingsController from "../controllers/MvpSettingsController";

const authRoutes = Router();

authRoutes.post("/signup", envTokenAuth, UserController.store);
authRoutes.post("/login", SessionController.store);
authRoutes.post("/refresh_token", SessionController.update);
authRoutes.delete("/logout", isAuth, SessionController.remove);
authRoutes.get("/me", isAuth, SessionController.me);

// MVP account settings. /auth is already routed correctly in production.
authRoutes.get("/settings/users", isAuth, MvpSettingsController.listUsers);
authRoutes.get("/settings/profile/:userId", isAuth, MvpSettingsController.showProfile);
authRoutes.put("/settings/profile/:userId", isAuth, MvpSettingsController.updateProfile);

export default authRoutes;
