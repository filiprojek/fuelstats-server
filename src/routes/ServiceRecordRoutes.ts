import express, { Router } from "express";
import ServiceRecordController from "../controllers/ServiceRecordController";
import { requireAuth } from "../middlewares/AuthMiddleware";

const router = Router();

router.get("/export", requireAuth, ServiceRecordController.exportCSV);
router.post("/import", requireAuth, express.text({ type: ["text/csv", "text/plain"], limit: "10mb" }), ServiceRecordController.importCSV);

router.get("/", requireAuth, ServiceRecordController.list);
router.post("/", requireAuth, ServiceRecordController.create);
router.get("/:id", requireAuth, ServiceRecordController.show);
router.put("/:id", requireAuth, ServiceRecordController.update);
router.delete("/:id", requireAuth, ServiceRecordController.remove);

export default router;
