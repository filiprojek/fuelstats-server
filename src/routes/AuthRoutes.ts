import { Router } from "express";
import AuthController from "../controllers/AuthController";

const router = Router();

// Public auth endpoints
router.post("/signup", AuthController.signup);
router.post("/signin", AuthController.signin);
router.post("/signout", AuthController.signout);

export default router;
