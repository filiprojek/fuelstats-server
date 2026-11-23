import { type NextFunction, type Request, type Response, Router } from "express";

export const router = Router();

router.use((req: Request, res: Response, next: NextFunction) => {
	console.log("Hi :)");

	next();
});
