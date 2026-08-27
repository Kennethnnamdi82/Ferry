import { Router } from "express";

import auth from "../middleware/auth.js";

import * as c from "../controllers/authController.js";

const router = Router();

router.post("/register", c.register);

router.post("/login", c.login);

router.post("/refresh", c.refresh);

router.post("/logout", auth, c.logout);

router.get("/me", auth, c.me);

router.get("/verify-email", c.verifyEmail);

export default router;
