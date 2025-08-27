import { Router } from "express";
import VehicleController from "../controllers/VehicleController";
import { requireAuth } from "../middlewares/AuthMiddleware";

const router = Router();

// GET /api/v1/vehicles
router.get("/", requireAuth, VehicleController.list);

// POST /api/v1/vehicles
router.post("/", requireAuth, VehicleController.create);

export default router;
