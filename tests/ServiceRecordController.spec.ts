import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import ServiceRecordService from "../src/services/ServiceRecordService";
import env from "../src/config/environment";

describe("ServiceRecordController – POST /api/v1/services", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

	const createDto = {
		userId,
		vehicleId: "veh1",
		serviceType: "oil_filter",
		itemName: "OEM",
		cost: 40,
		mileage: 1000,
		date: "2024-01-01T00:00:00.000Z",
	};

	const returned = { ...createDto, id: "srv1", createdAt: new Date().toISOString() };

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).post("/api/v1/services").send(createDto);
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

        it("calls ServiceRecordService.create and returns 201 + payload", async () => {
                const spy = jest.spyOn(ServiceRecordService, "create").mockResolvedValue(returned as any);

                const res = await request(app)
                        .post("/api/v1/services")
                        .set("Authorization", `Bearer ${token}`)
                        .send({
                                vehicleId: createDto.vehicleId,
                                serviceType: createDto.serviceType,
                                itemName: createDto.itemName,
                                cost: createDto.cost,
                                mileage: createDto.mileage,
                                date: createDto.date,
                        });

                expect(spy).toHaveBeenCalledWith(
                        expect.objectContaining({
                                userId,
                                vehicleId: createDto.vehicleId,
                                serviceType: createDto.serviceType,
                                itemName: createDto.itemName,
                                cost: createDto.cost,
                                mileage: createDto.mileage,
                                date: new Date(createDto.date),
                        }),
                );
                expect(res.status).toBe(201);
                expect(res.body).toEqual(returned);
        });
});

describe("ServiceRecordController – PUT /api/v1/services/:id", () => {
	const userId = "user123";
	const recordId = "srv789";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

	const updatePayload = { cost: 60 };
	const returned = {
		id: recordId,
		userId,
		vehicleId: "veh1",
		serviceType: "oil_filter",
		itemName: "OEM",
		cost: updatePayload.cost,
		mileage: 1000,
		date: "2024-01-01T00:00:00.000Z",
		createdAt: new Date().toISOString(),
	};

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).put(`/api/v1/services/${recordId}`).send(updatePayload);
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

        it("calls ServiceRecordService.update and returns 200 + payload", async () => {
                const spy = jest.spyOn(ServiceRecordService, "update").mockResolvedValue(returned as any);

                const res = await request(app)
                        .put(`/api/v1/services/${recordId}`)
                        .set("Authorization", `Bearer ${token}`)
                        .send(updatePayload);

                expect(spy).toHaveBeenCalledWith(recordId, userId, expect.objectContaining(updatePayload));
                expect(res.status).toBe(200);
                expect(res.body).toEqual(returned);
        });

	it("returns 404 when ServiceRecordService.update throws 'Service record not found'", async () => {
		jest.spyOn(ServiceRecordService, "update").mockRejectedValue(new Error("Service record not found"));

		const res = await request(app).put(`/api/v1/services/${recordId}`).set("Authorization", `Bearer ${token}`).send(updatePayload);

		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: "Service record not found" });
	});
});

describe("ServiceRecordController – GET /api/v1/services", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

	const returned = [
		{ id: "r1", userId, vehicleId: "veh1", serviceType: "oil_filter", itemName: "OEM", cost: 40, mileage: 1000, date: "2024-01-01T00:00:00.000Z", createdAt: new Date().toISOString() },
	];

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).get("/api/v1/services");
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

	it("calls ServiceRecordService.list and returns 200 + payload", async () => {
		const spy = jest.spyOn(ServiceRecordService, "list").mockResolvedValue(returned as any);
		const res = await request(app).get("/api/v1/services").set("Authorization", `Bearer ${token}`);
		expect(spy).toHaveBeenCalledWith(userId);
		expect(res.status).toBe(200);
		expect(res.body).toEqual(returned);
	});
});

describe("ServiceRecordController – GET /api/v1/services/:id", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });
	const id = "srv1";
	const returned = { id, userId, vehicleId: "veh1", serviceType: "oil_filter", itemName: "OEM", cost: 40, mileage: 1000, date: "2024-01-01T00:00:00.000Z", createdAt: new Date().toISOString() };

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).get(`/api/v1/services/${id}`);
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

	it("returns 404 when record is not found", async () => {
		jest.spyOn(ServiceRecordService, "getById").mockResolvedValue(null);
		const res = await request(app).get(`/api/v1/services/${id}`).set("Authorization", `Bearer ${token}`);
		expect(res.status).toBe(404);
		expect(res.body).toMatchObject({ message: expect.stringContaining("not found") });
	});

	it("calls ServiceRecordService.getById and returns 200 + payload", async () => {
		const spy = jest.spyOn(ServiceRecordService, "getById").mockResolvedValue(returned as any);
		const res = await request(app).get(`/api/v1/services/${id}`).set("Authorization", `Bearer ${token}`);
		expect(spy).toHaveBeenCalledWith(id, userId);
		expect(res.status).toBe(200);
		expect(res.body).toEqual(returned);
	});
});

describe("ServiceRecordController – DELETE /api/v1/services/:id", () => {
	const userId = "user123";
	const recordId = "srv123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).delete(`/api/v1/services/${recordId}`);
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

	it("calls ServiceRecordService.remove and returns 204 on success", async () => {
		const spy = jest.spyOn(ServiceRecordService, "remove").mockResolvedValue();
		const res = await request(app).delete(`/api/v1/services/${recordId}`).set("Authorization", `Bearer ${token}`);
		expect(spy).toHaveBeenCalledWith(recordId, userId);
		expect(res.status).toBe(204);
		expect(res.body).toEqual({});
	});

	it("returns 404 if record not found", async () => {
		jest.spyOn(ServiceRecordService, "remove").mockRejectedValue(new Error("Service record not found"));
		const res = await request(app).delete(`/api/v1/services/${recordId}`).set("Authorization", `Bearer ${token}`);
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: "Service record not found" });
	});

	it("returns 500 if service throws", async () => {
		jest.spyOn(ServiceRecordService, "remove").mockRejectedValue(new Error("boom"));
		const res = await request(app).delete(`/api/v1/services/${recordId}`).set("Authorization", `Bearer ${token}`);
		expect(res.status).toBe(500);
		expect(res.body).toEqual({ message: "Service record deletion failed" });
	});
});
