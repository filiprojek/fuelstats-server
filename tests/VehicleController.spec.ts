import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import VehicleService from "../src/services/VehicleService";
import env from "../src/config/environment";

describe("VehicleController – POST /api/v1/vehicles", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, {
		expiresIn: "1h",
	});

	const createDto = {
		userId, // will be overwritten by controller from token
		name: "My Car",
		registrationPlate: "ABC-123",
		fuelType: "petrol",
		note: "Test vehicle",
		isDefault: true,
	};

	const returned = {
		id: "veh456",
		userId,
		name: createDto.name,
		registrationPlate: createDto.registrationPlate,
		fuelType: createDto.fuelType,
		note: createDto.note,
		isDefault: createDto.isDefault,
		createdAt: new Date().toISOString(),
	};

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).post("/api/v1/vehicles").send(createDto);
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

	it("calls VehicleService.create and returns 201 + payload", async () => {
		const spy = jest.spyOn(VehicleService, "create").mockResolvedValue(returned as any);

		const res = await request(app).post("/api/v1/vehicles").set("Authorization", `Bearer ${token}`).send({
			// omit userId client-side
			name: createDto.name,
			registrationPlate: createDto.registrationPlate,
			fuelType: createDto.fuelType,
			note: createDto.note,
			isDefault: createDto.isDefault,
		});

		expect(spy).toHaveBeenCalledWith({
			userId,
			name: createDto.name,
			registrationPlate: createDto.registrationPlate,
			fuelType: createDto.fuelType,
			note: createDto.note,
			isDefault: createDto.isDefault,
		});

		expect(res.status).toBe(201);
		expect(res.body).toEqual(returned);
	});
});

describe("VehicleController – GET /api/v1/vehicles", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, {
		expiresIn: "1h",
	});

	const returned = [
		{
			id: "veh1",
			userId,
			name: "Car 1",
			registrationPlate: "AAA-111",
			fuelType: "petrol",
			note: "n1",
			isDefault: true,
			createdAt: new Date().toISOString(),
		},
	];

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).get("/api/v1/vehicles");
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

	it("calls VehicleService.list and returns 200 + payload", async () => {
		const spy = jest.spyOn(VehicleService, "list").mockResolvedValue(returned as any);
		const res = await request(app).get("/api/v1/vehicles").set("Authorization", `Bearer ${token}`);
		expect(spy).toHaveBeenCalledWith(userId);
		expect(res.status).toBe(200);
		expect(res.body).toEqual(returned);
	});
});

describe("VehicleController – GET /api/v1/vehicles/:id", () => {
	const userId = "user123";
	const token = jwt.sign({ sub: userId, email: "x@example.com" }, env.JWT_SECRET, {
		expiresIn: "1h",
	});
	const id = "veh789";
	const returned = {
		id,
		userId,
		name: "My Car",
		registrationPlate: "ABC-123",
		fuelType: "petrol",
		note: "Test vehicle",
		isDefault: true,
		createdAt: new Date().toISOString(),
	};

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("returns 401 if not authenticated", async () => {
		const res = await request(app).get(`/api/v1/vehicles/${id}`);
		expect(res.status).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Unauthorized") });
	});

	it("returns 404 when vehicle is not found", async () => {
		jest.spyOn(VehicleService, "getById").mockResolvedValue(null);
		const res = await request(app).get(`/api/v1/vehicles/${id}`).set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(404);
		expect(res.body).toMatchObject({ message: expect.stringContaining("not found") });
	});

	it("calls VehicleService.getById and returns 200 + payload", async () => {
		const spy = jest.spyOn(VehicleService, "getById").mockResolvedValue(returned as any);

		const res = await request(app).get(`/api/v1/vehicles/${id}`).set("Authorization", `Bearer ${token}`);

		expect(spy).toHaveBeenCalledWith(id, userId);
		expect(res.status).toBe(200);
		expect(res.body).toEqual(returned);
	});
});
