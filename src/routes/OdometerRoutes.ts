import { Router } from "express";
import OdometerController from "../controllers/OdometerController";
import { requireAuth } from "../middlewares/AuthMiddleware";

const router = Router();

router.use(requireAuth);

router.post("/", OdometerController.create);
router.get("/", OdometerController.list);
router.get("/:id", OdometerController.getById);
router.put("/:id", OdometerController.update);
router.delete("/:id", OdometerController.remove);

export default router;
