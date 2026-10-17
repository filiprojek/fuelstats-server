import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import OdometerService from "../src/services/OdometerService";
import env from "../src/config/environment";

describe("OdometerController – edge cases", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "u@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });
	const auth = { Authorization: `Bearer ${token}` };

	afterEach(() => jest.restoreAllMocks());

	describe("POST /api/v1/odometer", () => {
		it("requires vehicleId and mileage", async () => {
			const res = await request(app).post("/api/v1/odometer").set(auth).send({ vehicleId: "v1" });
			expect(res.status).toBe(400);
		});

		it("converts mileage and date", async () => {
			const spy = jest.spyOn(OdometerService, "create").mockResolvedValue({ id: "o1" } as any);
			await request(app).post("/api/v1/odometer").set(auth).send({ vehicleId: "v1", mileage: "123", date: "2026-01-02", note: "n" });
			expect(spy).toHaveBeenCalledWith({ userId, vehicleId: "v1", mileage: 123, date: new Date("2026-01-02"), note: "n" });
		});

		it("returns 500 when creation fails", async () => {
			jest.spyOn(OdometerService, "create").mockRejectedValue(new Error("db"));
			const res = await request(app).post("/api/v1/odometer").set(auth).send({ vehicleId: "v1", mileage: 1 });
			expect(res.status).toBe(500);
		});
	});

	describe("GET /api/v1/odometer", () => {
		it("filters by vehicle", async () => {
			const spy = jest.spyOn(OdometerService, "list").mockResolvedValue([]);
			await request(app).get("/api/v1/odometer?vehicleId=v1").set(auth);
			expect(spy).toHaveBeenCalledWith(userId, "v1");
		});

		it("returns 500 when listing fails", async () => {
			jest.spyOn(OdometerService, "list").mockRejectedValue(new Error("db"));
			const res = await request(app).get("/api/v1/odometer").set(auth);
			expect(res.status).toBe(500);
		});
	});

	describe("GET /api/v1/odometer/:id", () => {
		it("returns the record", async () => {
			jest.spyOn(OdometerService, "getById").mockResolvedValue({ id: "o1" } as any);
			const res = await request(app).get("/api/v1/odometer/o1").set(auth);
			expect(res.status).toBe(200);
			expect(res.body).toEqual({ id: "o1" });
		});

		it("returns 404 when missing", async () => {
			jest.spyOn(OdometerService, "getById").mockResolvedValue(null);
			const res = await request(app).get("/api/v1/odometer/o1").set(auth);
			expect(res.status).toBe(404);
		});

		it("returns 500 on errors", async () => {
			jest.spyOn(OdometerService, "getById").mockRejectedValue(new Error("db"));
			const res = await request(app).get("/api/v1/odometer/o1").set(auth);
			expect(res.status).toBe(500);
		});
	});

	describe("PUT /api/v1/odometer/:id", () => {
		it("only sends provided fields", async () => {
			const spy = jest.spyOn(OdometerService, "update").mockResolvedValue({ id: "o1" } as any);
			const res = await request(app).put("/api/v1/odometer/o1").set(auth).send({ mileage: "500", note: "" });
			expect(res.status).toBe(200);
			expect(spy).toHaveBeenCalledWith("o1", userId, { mileage: 500, note: "" });
		});

		it("sends vehicle and date when given", async () => {
			const spy = jest.spyOn(OdometerService, "update").mockResolvedValue({} as any);
			await request(app).put("/api/v1/odometer/o1").set(auth).send({ vehicleId: "v2", date: "2026-03-04" });
			expect(spy).toHaveBeenCalledWith("o1", userId, { vehicleId: "v2", date: new Date("2026-03-04") });
		});

		it("returns 404 for unknown records and 500 otherwise", async () => {
			jest.spyOn(OdometerService, "update").mockRejectedValueOnce(new Error("Odometer record not found")).mockRejectedValueOnce(new Error("db"));
			expect((await request(app).put("/api/v1/odometer/o1").set(auth).send({})).status).toBe(404);
			expect((await request(app).put("/api/v1/odometer/o1").set(auth).send({})).status).toBe(500);
		});
	});

	describe("DELETE /api/v1/odometer/:id", () => {
		it("returns 404 for unknown records and 500 otherwise", async () => {
			jest.spyOn(OdometerService, "remove").mockRejectedValueOnce(new Error("Odometer record not found")).mockRejectedValueOnce(new Error("db"));
			expect((await request(app).delete("/api/v1/odometer/o1").set(auth)).status).toBe(404);
			expect((await request(app).delete("/api/v1/odometer/o1").set(auth)).status).toBe(500);
		});
	});
});
