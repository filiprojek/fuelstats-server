import express, { Router } from "express";
import RefuelController from "../controllers/RefuelController";
import { requireAuth } from "../middlewares/AuthMiddleware";

const router = Router();

router.get("/export", requireAuth, RefuelController.exportCSV);
router.post("/import", requireAuth, express.text({ type: ["text/csv", "text/plain"], limit: "10mb" }), RefuelController.importCSV);

router.get("/", requireAuth, RefuelController.list);
router.post("/", requireAuth, RefuelController.create);
router.get("/:id", requireAuth, RefuelController.show);
router.put("/:id", requireAuth, RefuelController.update);
router.delete("/:id", requireAuth, RefuelController.remove);

export default router;
