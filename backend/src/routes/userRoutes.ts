import { Router } from "express";

import isAuth from "../middleware/isAuth";
import * as UserController from "../controllers/UserController";
import * as ProfileController from "../controllers/ProfileController";

const userRoutes = Router();

userRoutes.get("/users", isAuth, UserController.index);

userRoutes.get("/users/list", isAuth, UserController.list);

// PortoPlan Chatbot profile/settings routes. Kept under /users so they also
// work in deployments that proxy the existing user API paths explicitly.
userRoutes.get("/users/profile/list", isAuth, ProfileController.list);
userRoutes.get("/users/profile/:userId", isAuth, ProfileController.show);
userRoutes.put("/users/profile/:userId", isAuth, ProfileController.update);

userRoutes.post("/users", isAuth, UserController.store);

userRoutes.put("/users/:userId", isAuth, UserController.update);

userRoutes.get("/users/:userId", isAuth, UserController.show);

userRoutes.delete("/users/:userId", isAuth, UserController.remove);

export default userRoutes;
