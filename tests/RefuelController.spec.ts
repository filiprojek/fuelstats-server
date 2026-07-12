import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import RefuelService from "../src/services/RefuelService";
import env from "../src/config/environment";

describe("RefuelController – POST /api/v1/refuels", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

	const createDto = {
		userId,
		vehicleId: "veh1",
		fuelType: "petrol",
		note: "note",
		liters: 10,
		pricePerLiter: 1.2,
		totalPrice: 12,
		mileage: 1000,
	};

	const returned = {
		id: "ref1",
		userId,
		vehicleId: createDto.vehicleId,
		fuelType: createDto.fuelType,
		note: createDto.note,
		liters: createDto.liters,
		pricePerLiter: createDto.pricePerLiter,
		totalPrice: createDto.totalPrice,
		mileage: createDto.mileage,
		createdAt: new Date().toISOString(),
	};

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).post("/api/v1/refuels").send(createDto);
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

	it("calls RefuelService.create and returns 201 + payload", async () => {
		const spy = jest.spyOn(RefuelService, "create").mockResolvedValue(returned as any);

		const res = await request(app).post("/api/v1/refuels").set("Authorization", `Bearer ${token}`).send({
			vehicleId: createDto.vehicleId,
			fuelType: createDto.fuelType,
			note: createDto.note,
			liters: createDto.liters,
			pricePerLiter: createDto.pricePerLiter,
			totalPrice: createDto.totalPrice,
			mileage: createDto.mileage,
		});

		expect(spy).toHaveBeenCalledWith({
			userId,
			vehicleId: createDto.vehicleId,
			fuelType: createDto.fuelType,
			note: createDto.note,
			liters: createDto.liters,
			pricePerLiter: createDto.pricePerLiter,
			totalPrice: createDto.totalPrice,
			mileage: createDto.mileage,
		});
		expect(res.status).toBe(201);
		expect(res.body).toEqual(returned);
	});

	it("calls RefuelService.create with custom date if provided in req.body", async () => {
		const spy = jest.spyOn(RefuelService, "create").mockResolvedValue(returned as any);
		const customDate = "2024-01-01T12:00:00.000Z";

		const res = await request(app).post("/api/v1/refuels").set("Authorization", `Bearer ${token}`).send({
			vehicleId: createDto.vehicleId,
			fuelType: createDto.fuelType,
			note: createDto.note,
			liters: createDto.liters,
			pricePerLiter: createDto.pricePerLiter,
			totalPrice: createDto.totalPrice,
			mileage: createDto.mileage,
			date: customDate,
		});

		expect(spy).toHaveBeenCalledWith({
			userId,
			vehicleId: createDto.vehicleId,
			fuelType: createDto.fuelType,
			note: createDto.note,
			liters: createDto.liters,
			pricePerLiter: createDto.pricePerLiter,
			totalPrice: createDto.totalPrice,
			mileage: createDto.mileage,
			createdAt: new Date(customDate),
		});
		expect(res.status).toBe(201);
	});
});

describe("RefuelController – PUT /api/v1/refuels/:id", () => {
	const userId = "user123";
	const refuelId = "ref789";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

	const updatePayload = { liters: 20 };
	const returned = {
		id: refuelId,
		userId,
		vehicleId: "veh1",
		fuelType: "petrol",
		note: "note",
		liters: updatePayload.liters,
		pricePerLiter: 1.2,
		totalPrice: 24,
		mileage: 1100,
		createdAt: new Date().toISOString(),
	};

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).put(`/api/v1/refuels/${refuelId}`).send(updatePayload);
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

	it("calls RefuelService.update and returns 200 + payload", async () => {
		const spy = jest.spyOn(RefuelService, "update").mockResolvedValue(returned as any);

		const res = await request(app).put(`/api/v1/refuels/${refuelId}`).set("Authorization", `Bearer ${token}`).send(updatePayload);

		expect(spy).toHaveBeenCalledWith(refuelId, userId, updatePayload);
		expect(res.status).toBe(200);
		expect(res.body).toEqual(returned);
	});

	it("returns 404 when RefuelService.update throws 'Refuel not found'", async () => {
		jest.spyOn(RefuelService, "update").mockRejectedValue(new Error("Refuel not found"));

		const res = await request(app).put(`/api/v1/refuels/${refuelId}`).set("Authorization", `Bearer ${token}`).send(updatePayload);

		expect(res.status).toBe(404);
		expect(res.body).toMatchObject({ message: "Refuel not found" });
	});
});

describe("RefuelController – GET /api/v1/refuels", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

	const returned = [
		{
			id: "r1",
			userId,
			vehicleId: "veh1",
			fuelType: "petrol",
			note: "note",
			liters: 10,
			pricePerLiter: 1.2,
			totalPrice: 12,
			mileage: 1000,
			createdAt: new Date().toISOString(),
		},
	];

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).get("/api/v1/refuels");
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

	it("calls RefuelService.list and returns 200 + payload", async () => {
		const spy = jest.spyOn(RefuelService, "list").mockResolvedValue(returned as any);
		const res = await request(app).get("/api/v1/refuels").set("Authorization", `Bearer ${token}`);
		expect(spy).toHaveBeenCalledWith(userId);
		expect(res.status).toBe(200);
		expect(res.body).toEqual(returned);
	});
});

describe("RefuelController – GET /api/v1/refuels/:id", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });
	const id = "ref1";
	const returned = {
		id,
		userId,
		vehicleId: "veh1",
		fuelType: "petrol",
		note: "note",
		liters: 10,
		pricePerLiter: 1.2,
		totalPrice: 12,
		mileage: 1000,
		createdAt: new Date().toISOString(),
	};

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).get(`/api/v1/refuels/${id}`);
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

	it("returns 404 when refuel is not found", async () => {
		jest.spyOn(RefuelService, "getById").mockResolvedValue(null);
		const res = await request(app).get(`/api/v1/refuels/${id}`).set("Authorization", `Bearer ${token}`);
		expect(res.status).toBe(404);
		expect(res.body).toMatchObject({ message: expect.stringContaining("not found") });
	});

	it("calls RefuelService.getById and returns 200 + payload", async () => {
		const spy = jest.spyOn(RefuelService, "getById").mockResolvedValue(returned as any);
		const res = await request(app).get(`/api/v1/refuels/${id}`).set("Authorization", `Bearer ${token}`);
		expect(spy).toHaveBeenCalledWith(id, userId);
		expect(res.status).toBe(200);
		expect(res.body).toEqual(returned);
	});
});

describe("RefuelController – DELETE /api/v1/refuels/:id", () => {
	const userId = "user123";
	const refuelId = "ref123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).delete(`/api/v1/refuels/${refuelId}`);
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

	it("calls RefuelService.remove and returns 204 on success", async () => {
		const spy = jest.spyOn(RefuelService, "remove").mockResolvedValue();
		const res = await request(app).delete(`/api/v1/refuels/${refuelId}`).set("Authorization", `Bearer ${token}`);
		expect(spy).toHaveBeenCalledWith(refuelId, userId);
		expect(res.status).toBe(204);
		expect(res.body).toEqual({});
	});

	it("returns 404 if refuel not found", async () => {
		jest.spyOn(RefuelService, "remove").mockRejectedValue(new Error("Refuel not found"));
		const res = await request(app).delete(`/api/v1/refuels/${refuelId}`).set("Authorization", `Bearer ${token}`);
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: "Refuel not found" });
	});

	it("returns 500 if service throws", async () => {
		jest.spyOn(RefuelService, "remove").mockRejectedValue(new Error("boom"));
		const res = await request(app).delete(`/api/v1/refuels/${refuelId}`).set("Authorization", `Bearer ${token}`);
		expect(res.status).toBe(500);
		expect(res.body).toEqual({ message: "Refuel deletion failed" });
	});
});

describe("RefuelController – GET /api/v1/refuels/export", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("calls RefuelService.exportCSV and returns CSV content", async () => {
		const csvData = "id,vehicleId,fuelType,note,liters,pricePerLiter,totalPrice,mileage,createdAt\nref1,veh1,petrol,note,10,1.2,12,1000,2026-07-12T16:23:59.000Z";
		const spy = jest.spyOn(RefuelService, "exportCSV").mockResolvedValue(csvData);

		const res = await request(app).get("/api/v1/refuels/export").set("Authorization", `Bearer ${token}`);

		expect(spy).toHaveBeenCalledWith(userId, undefined);
		expect(res.status).toBe(200);
		expect(res.header["content-type"]).toContain("text/csv");
		expect(res.text).toBe(csvData);
	});

	it("forwards vehicleId query param if provided", async () => {
		const spy = jest.spyOn(RefuelService, "exportCSV").mockResolvedValue("");
		await request(app).get("/api/v1/refuels/export?vehicleId=veh123").set("Authorization", `Bearer ${token}`);
		expect(spy).toHaveBeenCalledWith(userId, "veh123");
	});
});

describe("RefuelController – POST /api/v1/refuels/import", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("calls RefuelService.importCSV and returns 201 with imported records", async () => {
		const csvData = "vehicleId,fuelType,note,liters,pricePerLiter,totalPrice,mileage\nveh1,petrol,note,10,1.2,12,1000";
		const importedRecords = [{ id: "ref1", userId, vehicleId: "veh1" }];
		const spy = jest.spyOn(RefuelService, "importCSV").mockResolvedValue(importedRecords as any);

		const res = await request(app).post("/api/v1/refuels/import").set("Authorization", `Bearer ${token}`).set("Content-Type", "text/csv").send(csvData);

		expect(spy).toHaveBeenCalledWith(userId, csvData, undefined);
		expect(res.status).toBe(201);
		expect(res.body.count).toBe(1);
		expect(res.body.records).toEqual(importedRecords);
	});

	it("supports JSON body containing csv field", async () => {
		const csvData = "vehicleId,fuelType,note,liters,pricePerLiter,totalPrice,mileage\nveh1,petrol,note,10,1.2,12,1000";
		const spy = jest.spyOn(RefuelService, "importCSV").mockResolvedValue([]);

		await request(app).post("/api/v1/refuels/import").set("Authorization", `Bearer ${token}`).send({ csv: csvData });

		expect(spy).toHaveBeenCalledWith(userId, csvData, undefined);
	});
});
