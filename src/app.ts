import express, { type NextFunction, type Request, type Response } from "express";
import morgan from "morgan";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { router as routes } from "./routes";
import { router as middlewares } from "./middlewares";
import env from "./config/environment";

export let corsWhitelist: Array<string>;
if (env.CORS_WHITELIST != "undefined") {
	corsWhitelist = [...["http://localhost:8080", "http://localhost:6040"], ...env.CORS_WHITELIST.split(";")];
} else {
	corsWhitelist = ["http://localhost:8080", "http://localhost:6040"];
}
const corsOptions = {
	origin: function (origin: any, callback: any) {
		if (!origin || corsWhitelist.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			callback(new Error("Not allowed by CORS"));
		}
	},
	optionsSuccessStatus: 200,
	credentials: true,
};

export const app = express();

// Middlewares
app.use(middlewares);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true, limit: env.BODY_LIMIT }));
app.use(express.json({ limit: env.BODY_LIMIT }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

// Routes
app.use(routes);

// SPA fallback: Serve index.html for client-side routing on non-API routes
app.get(/.*/, (req, res, next) => {
	if (req.path.startsWith("/api/")) {
		return next();
	}
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Body parser errors: answer oversized uploads with JSON the app can show
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
	if (err?.type === "entity.too.large") {
		return res.status(413).json({ message: `Request too large (limit ${env.BODY_LIMIT}). Try fewer or smaller photos.` });
	}
	return next(err);
});
