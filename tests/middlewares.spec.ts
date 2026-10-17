import express from "express";
import request from "supertest";
import { query } from "express-validator";
import handleValidation from "../src/middlewares/handleValidation";
import { app } from "../src/app";

describe("handleValidation", () => {
	const testApp = express();
	testApp.get("/v", query("name").isString().notEmpty(), handleValidation.handleValidationError, (_req, res) => {
		res.json({ ok: true });
	});

	it("passes valid requests through", async () => {
		const res = await request(testApp).get("/v?name=x");
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true });
	});

	it("rejects invalid requests with 400 and the first validation error", async () => {
		const res = await request(testApp).get("/v");
		expect(res.status).toBe(400);
		expect(res.body).toMatchObject({ code: 400, message: "validation error", data: expect.objectContaining({ path: "name" }) });
	});
});

describe("app routing", () => {
	it("renders the home page at /", async () => {
		const res = await request(app).get("/");
		expect(res.status).toBe(200);
		expect(res.headers["content-type"]).toMatch(/html/);
	});

	it("answers unknown API routes with 404", async () => {
		const res = await request(app).get("/api/v1/does-not-exist");
		expect(res.status).toBe(404);
		expect(res.text).toBe("E404");
	});

	it("allows whitelisted CORS origins and rejects others", async () => {
		const ok = await request(app).get("/api/v1/version").set("Origin", "http://localhost:8080");
		expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:8080");
		expect(ok.headers["access-control-allow-credentials"]).toBe("true");
		const blocked = await request(app).get("/api/v1/version").set("Origin", "http://evil.example.com");
		expect(blocked.status).toBe(500);
	});
});
