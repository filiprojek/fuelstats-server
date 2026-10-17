import { Router } from "express";
import UserController from "../controllers/UserController";
import { requireAuth } from "../middlewares/AuthMiddleware";

const router = Router();

router.get("/me", requireAuth, UserController.me);
router.put("/password", requireAuth, UserController.setPassword);
router.delete("/identities/:provider", requireAuth, UserController.unlinkIdentity);

export default router;
