import express from "express";
import { query } from "express-validator";
import fs from "fs";
import path from "path";
import request from "supertest";
import { app } from "../src/app";
import { parseBodyLimit } from "../src/config/environment";
import handleValidation from "../src/middlewares/handleValidation";

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

	describe("SPA fallback", () => {
		// The built frontend is copied into src/public at image build time (gitignored),
		// so provide a stand-in index.html unless a real build is already there.
		const indexHtml = path.join(__dirname, "../src/public/index.html");
		let created = false;
		beforeAll(() => {
			if (!fs.existsSync(indexHtml)) {
				fs.writeFileSync(indexHtml, "<!doctype html><title>spa-fixture</title>");
				created = true;
			}
		});
		afterAll(() => {
			if (created) fs.unlinkSync(indexHtml);
		});

		it.each(["/login", "/vehicles/123", "/settings/sign-in"])("serves index.html for client route %s", async (route) => {
			const res = await request(app).get(route);
			expect(res.status).toBe(200);
			expect(res.headers["content-type"]).toMatch(/html/);
			expect(res.text).toBe(fs.readFileSync(indexHtml, "utf8"));
		});

		it("does not serve index.html for missing files", async () => {
			const res = await request(app).get("/assets/missing-chunk.js");
			expect(res.status).toBe(404);
		});

		it("does not serve index.html for non-GET requests", async () => {
			const res = await request(app).post("/login");
			expect(res.status).toBe(404);
		});

		it("still answers unknown API routes with 404", async () => {
			const res = await request(app).get("/api/v1/does-not-exist");
			expect(res.status).toBe(404);
			expect(res.text).toBe("E404");
		});
	});

	it("allows whitelisted CORS origins and rejects others", async () => {
		const ok = await request(app).get("/api/v1/version").set("Origin", "http://localhost:8080");
		expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:8080");
		expect(ok.headers["access-control-allow-credentials"]).toBe("true");
		const blocked = await request(app).get("/api/v1/version").set("Origin", "http://evil.example.com");
		expect(blocked.status).toBe(500);
	});
});

describe("request body size", () => {
	const json = (bytes: number) => JSON.stringify({ photos: [`data:image/jpeg;base64,${"A".repeat(bytes)}`] });

	it("defaults the body limit to 25mb and accepts custom values", () => {
		expect(parseBodyLimit(undefined)).toBe("25mb");
		expect(parseBodyLimit("")).toBe("25mb");
		expect(parseBodyLimit("50mb")).toBe("50mb");
	});

	it("accepts JSON bodies with photos well above the express default of 100kb", async () => {
		// parsed successfully, then rejected by requireAuth instead of the body parser
		const res = await request(app)
			.post("/api/v1/services")
			.set("Content-Type", "application/json")
			.send(json(5 * 1024 * 1024));
		expect(res.status).toBe(401);
	});

	it("answers bodies above the limit with a JSON 413", async () => {
		const res = await request(app)
			.post("/api/v1/services")
			.set("Content-Type", "application/json")
			.send(json(26 * 1024 * 1024));
		expect(res.status).toBe(413);
		expect(res.body).toEqual({ message: expect.stringMatching(/too large/i) });
	});
});
