import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import ServiceTrackerService from "../src/services/ServiceTrackerService";
import env from "../src/config/environment";

describe("ServiceTrackerController", () => {
	const userId = "user123";
	const carId = "car456";
	const token = jwt.sign({ sub: userId, email: "user@example.com" }, env.JWT_SECRET, {
		expiresIn: "1h",
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe("GET /api/v1/vehicles/service-tasks", () => {
		it("returns 401 if unauthenticated", async () => {
			const res = await request(app).get("/api/v1/vehicles/service-tasks");
			expect(res.status).toBe(401);
		});

		it("returns 200 with list of service tasks", async () => {
			const mockTasks = [{ id: "t1", name: "Oil Change" }];
			const spy = jest.spyOn(ServiceTrackerService, "listServiceTasks").mockResolvedValue(mockTasks as any);

			const res = await request(app)
				.get("/api/v1/vehicles/service-tasks")
				.set("Authorization", `Bearer ${token}`);

			expect(res.status).toBe(200);
			expect(spy).toHaveBeenCalled();
			expect(res.body).toEqual(mockTasks);
		});
	});

	describe("GET /api/v1/vehicles/:carId/service-intervals", () => {
		it("returns 401 if unauthenticated", async () => {
			const res = await request(app).get(`/api/v1/vehicles/${carId}/service-intervals`);
			expect(res.status).toBe(401);
		});

		it("returns 200 with vehicle intervals", async () => {
			const mockIntervals = [{ serviceTaskId: "t1", intervalKm: 15000 }];
			const spy = jest.spyOn(ServiceTrackerService, "getServiceIntervals").mockResolvedValue(mockIntervals as any);

			const res = await request(app)
				.get(`/api/v1/vehicles/${carId}/service-intervals`)
				.set("Authorization", `Bearer ${token}`);

			expect(res.status).toBe(200);
			expect(spy).toHaveBeenCalledWith(userId, carId);
			expect(res.body).toEqual(mockIntervals);
		});
	});

	describe("POST /api/v1/vehicles/:carId/service-intervals", () => {
		it("returns 401 if unauthenticated", async () => {
			const res = await request(app).post(`/api/v1/vehicles/${carId}/service-intervals`).send({ intervals: [] });
			expect(res.status).toBe(401);
		});

		it("returns 200 and saves intervals", async () => {
			const intervals = [{ serviceTaskId: "t1", intervalKm: 15000 }];
			const spy = jest.spyOn(ServiceTrackerService, "saveServiceIntervals").mockResolvedValue(intervals as any);

			const res = await request(app)
				.post(`/api/v1/vehicles/${carId}/service-intervals`)
				.set("Authorization", `Bearer ${token}`)
				.send({ intervals });

			expect(res.status).toBe(200);
			expect(spy).toHaveBeenCalledWith(userId, carId, intervals);
			expect(res.body).toEqual(intervals);
		});
	});

	describe("GET /api/v1/vehicles/:carId/service-status", () => {
		it("returns 401 if unauthenticated", async () => {
			const res = await request(app).get(`/api/v1/vehicles/${carId}/service-status`);
			expect(res.status).toBe(401);
		});

		it("returns 200 with service status", async () => {
			const mockStatus = [{ serviceTaskId: "t1", status: "OK", currentOdometer: 50000 }];
			const statusSpy = jest.spyOn(ServiceTrackerService, "getServiceStatus").mockResolvedValue(mockStatus as any);
			const odoSpy = jest.spyOn(ServiceTrackerService, "getLatestOdometer").mockResolvedValue(50000);

			const res = await request(app)
				.get(`/api/v1/vehicles/${carId}/service-status`)
				.set("Authorization", `Bearer ${token}`);

			expect(res.status).toBe(200);
			expect(statusSpy).toHaveBeenCalledWith(userId, carId);
			expect(odoSpy).toHaveBeenCalledWith(carId);
			expect(res.body.status).toEqual(mockStatus);
			expect(res.body.currentOdometer).toBe(50000);
		});
	});

	describe("POST /api/v1/vehicles/seed-test-data", () => {
		it("returns 401 if unauthenticated", async () => {
			const res = await request(app).post("/api/v1/vehicles/seed-test-data");
			expect(res.status).toBe(401);
		});

		it("returns 201 after seeding test data", async () => {
			const spy = jest.spyOn(ServiceTrackerService, "seedTestData").mockResolvedValue(undefined);

			const res = await request(app)
				.post("/api/v1/vehicles/seed-test-data")
				.set("Authorization", `Bearer ${token}`);

			expect(res.status).toBe(201);
			expect(spy).toHaveBeenCalledWith(userId);
		});
	});
});
