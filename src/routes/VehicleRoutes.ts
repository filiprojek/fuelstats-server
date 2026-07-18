import { Router } from "express";
import VehicleController from "../controllers/VehicleController";
import ServiceTrackerController from "../controllers/ServiceTrackerController";
import { requireAuth } from "../middlewares/AuthMiddleware";

const router = Router();

// GET /api/v1/vehicles/service-tasks
router.get("/service-tasks", requireAuth, ServiceTrackerController.listServiceTasks);

// POST /api/v1/vehicles/seed-test-data
router.post("/seed-test-data", requireAuth, ServiceTrackerController.seedTestData);

// GET /api/v1/vehicles
router.get("/", requireAuth, VehicleController.list);

// POST /api/v1/vehicles
router.post("/", requireAuth, VehicleController.create);

// GET /api/v1/vehicles/:carId/service-intervals
router.get("/:carId/service-intervals", requireAuth, ServiceTrackerController.getServiceIntervals);

// POST/PUT /api/v1/vehicles/:carId/service-intervals
router.post("/:carId/service-intervals", requireAuth, ServiceTrackerController.saveServiceIntervals);
router.put("/:carId/service-intervals", requireAuth, ServiceTrackerController.saveServiceIntervals);

// GET /api/v1/vehicles/:carId/service-status
router.get("/:carId/service-status", requireAuth, ServiceTrackerController.getServiceStatus);

// GET /api/v1/vehicles/:id
router.get("/:id", requireAuth, VehicleController.show);

// PUT /api/v1/vehicles/:id
router.put("/:id", requireAuth, VehicleController.update);

// DELETE /api/v1/vehicles/:id
router.delete("/:id", requireAuth, VehicleController.remove);

export default router;

