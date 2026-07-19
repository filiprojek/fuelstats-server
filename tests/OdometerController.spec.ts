import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import OdometerService from "../src/services/OdometerService";
import env from "../src/config/environment";

describe("OdometerController", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "user@example.com" }, env.JWT_SECRET, {
		expiresIn: "1h",
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe("POST /api/v1/odometer", () => {
		it("returns 401 if unauthenticated", async () => {
			const res = await request(app).post("/api/v1/odometer").send({ vehicleId: "veh1", mileage: 50000 });
			expect(res.status).toBe(401);
		});

		it("creates an odometer record", async () => {
			const mockRecord = {
				id: "odo123",
				userId,
				vehicleId: "veh1",
				mileage: 50000,
				date: new Date().toISOString(),
				createdAt: new Date().toISOString(),
			};

			const spy = jest.spyOn(OdometerService, "create").mockResolvedValue(mockRecord as any);

			const res = await request(app)
				.post("/api/v1/odometer")
				.set("Authorization", `Bearer ${token}`)
				.send({ vehicleId: "veh1", mileage: 50000 });

			expect(res.status).toBe(201);
			expect(spy).toHaveBeenCalled();
			expect(res.body.id).toBe("odo123");
		});
	});

	describe("GET /api/v1/odometer", () => {
		it("lists odometer records", async () => {
			const mockRecords = [{ id: "odo123", mileage: 50000 }];
			const spy = jest.spyOn(OdometerService, "list").mockResolvedValue(mockRecords as any);

			const res = await request(app)
				.get("/api/v1/odometer")
				.set("Authorization", `Bearer ${token}`);

			expect(res.status).toBe(200);
			expect(spy).toHaveBeenCalledWith(userId, undefined);
			expect(res.body).toEqual(mockRecords);
		});
	});

	describe("DELETE /api/v1/odometer/:id", () => {
		it("deletes an odometer record", async () => {
			const spy = jest.spyOn(OdometerService, "remove").mockResolvedValue(true);

			const res = await request(app)
				.delete("/api/v1/odometer/odo123")
				.set("Authorization", `Bearer ${token}`);

			expect(res.status).toBe(204);
			expect(spy).toHaveBeenCalledWith("odo123", userId);
		});
	});
});
