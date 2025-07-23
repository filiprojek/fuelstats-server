import { Request, Response, Router } from "express";
import { router as rootRoutes } from "./rootRoutes";
import AuthRoutes from "./AuthRoutes";
import UserRoutes from "./UserRoutes";

export const router = Router();

router.use(rootRoutes);
router.use("/api/v1/auth", AuthRoutes);
router.use("/api/v1/user", UserRoutes);

// 404
router.use((req: Request, res: Response) => {
	res.status(404).send("E404");
});
