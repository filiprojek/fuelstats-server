import request from "supertest";
import { app } from "../src/app";

describe("GET /api/v1/version", () => {
	it("returns 200 with server name, version, and apiVersion payload", async () => {
		const res = await request(app).get("/api/v1/version");

		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			name: "fuelstats-server",
			version: "1.1.0",
			apiVersion: "v1",
		});
	});
});
