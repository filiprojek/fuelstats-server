import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import jwt from "jsonwebtoken";
import { requireAuth, AuthRequest } from "../src/middlewares/AuthMiddleware";
import env from "../src/config/environment";

const app = express();
app.use(cookieParser());
app.get("/protected", requireAuth, (req: AuthRequest, res) => {
	res.json({ sub: req.user.sub });
});

const sign = (sub: string) => jwt.sign({ sub, email: `${sub}@example.com` }, env.JWT_SECRET, { expiresIn: "1h" });

describe("requireAuth middleware", () => {
	it("returns 401 when neither header nor cookie is present", async () => {
		const res = await request(app).get("/protected");
		expect(res.status).toBe(401);
		expect(res.body).toEqual({ message: "Unauthorized" });
	});

	it("returns 401 when the Authorization header is not a Bearer token", async () => {
		const res = await request(app).get("/protected").set("Authorization", "Basic abc");
		expect(res.status).toBe(401);
	});

	it("accepts a valid Bearer token", async () => {
		const res = await request(app).get("/protected").set("Authorization", `Bearer ${sign("u1")}`);
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ sub: "u1" });
	});

	it("accepts a valid jwt cookie", async () => {
		const res = await request(app).get("/protected").set("Cookie", `jwt=${sign("u2")}`);
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ sub: "u2" });
	});

	it("prefers the Bearer header over the cookie", async () => {
		const res = await request(app).get("/protected").set("Authorization", `Bearer ${sign("header")}`).set("Cookie", `jwt=${sign("cookie")}`);
		expect(res.body).toEqual({ sub: "header" });
	});

	it("returns 401 for a token signed with another secret", async () => {
		const bad = jwt.sign({ sub: "x" }, "other-secret");
		const res = await request(app).get("/protected").set("Authorization", `Bearer ${bad}`);
		expect(res.status).toBe(401);
		expect(res.body).toEqual({ message: "Invalid token" });
	});

	it("returns 401 for an expired token", async () => {
		const expired = jwt.sign({ sub: "x", exp: Math.floor(Date.now() / 1000) - 10 }, env.JWT_SECRET);
		const res = await request(app).get("/protected").set("Authorization", `Bearer ${expired}`);
		expect(res.status).toBe(401);
	});

	it("rejects special-purpose tokens such as SSO link tokens", async () => {
		const link = jwt.sign({ sub: "u1", purpose: "oidc-link", provider: "authelia" }, env.JWT_SECRET, { expiresIn: 60 });
		const res = await request(app).get("/protected").set("Authorization", `Bearer ${link}`);
		expect(res.status).toBe(401);
		expect(res.body).toEqual({ message: "Invalid token" });
	});
});
