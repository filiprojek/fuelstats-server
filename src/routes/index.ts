import { Request, Response, Router } from "express";
import { router as rootRoutes } from "./rootRoutes";
import AuthRoutes from "./AuthRoutes";
import UserRoutes from "./UserRoutes";
import VehicleRoutes from "./VehicleRoutes";
import RefuelRoutes from "./RefuelRoutes";
import ServiceRecordRoutes from "./ServiceRecordRoutes";

export const router = Router();

router.use(rootRoutes);

// Version endpoint
router.get("/api/v1/version", (req: Request, res: Response) => {
	res.json({
		name: "fuelstats-server",
		version: "1.0.0",
		apiVersion: "v1"
	});
});

router.use("/api/v1/auth", AuthRoutes);
router.use("/api/v1/user", UserRoutes);
router.use("/api/v1/vehicles", VehicleRoutes);
router.use("/api/v1/refuels", RefuelRoutes);
router.use("/api/v1/services", ServiceRecordRoutes);

// 404
router.use((req: Request, res: Response) => {
	res.status(404).send("E404");
});
