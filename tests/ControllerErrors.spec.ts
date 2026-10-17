import request from "supertest";
import jwt from "jsonwebtoken";
import fs from "fs-extra";
import { app } from "../src/app";
import env from "../src/config/environment";
import RefuelService from "../src/services/RefuelService";
import VehicleService from "../src/services/VehicleService";
import ServiceRecordService from "../src/services/ServiceRecordService";
import ServiceTrackerService from "../src/services/ServiceTrackerService";

const token = jwt.sign({ sub: "u1", email: "u@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });
const auth = { Authorization: `Bearer ${token}` };

type Method = "get" | "post" | "put" | "delete";
type Case = [string, Method, string, any, string, number];

const send = (method: Method, url: string, body?: unknown) => {
	const req = request(app)[method](url).set(auth);
	return body === undefined ? req : req.send(body as object);
};

describe("controller error handling", () => {
	afterEach(() => jest.restoreAllMocks());

	const generic: Case[] = [
		["vehicle create", "post", "/api/v1/vehicles", VehicleService, "create", 500],
		["vehicle show", "get", "/api/v1/vehicles/v1", VehicleService, "getById", 500],
		["vehicle list", "get", "/api/v1/vehicles", VehicleService, "list", 500],
		["vehicle update", "put", "/api/v1/vehicles/v1", VehicleService, "update", 500],
		["vehicle delete", "delete", "/api/v1/vehicles/v1", VehicleService, "remove", 500],
		["refuel create", "post", "/api/v1/refuels", RefuelService, "create", 500],
		["refuel show", "get", "/api/v1/refuels/r1", RefuelService, "getById", 500],
		["refuel list", "get", "/api/v1/refuels", RefuelService, "list", 500],
		["refuel update", "put", "/api/v1/refuels/r1", RefuelService, "update", 500],
		["refuel delete", "delete", "/api/v1/refuels/r1", RefuelService, "remove", 500],
		["refuel export", "get", "/api/v1/refuels/export", RefuelService, "exportCSV", 500],
		["service create", "post", "/api/v1/services", ServiceRecordService, "create", 500],
		["service show", "get", "/api/v1/services/s1", ServiceRecordService, "getById", 500],
		["service list", "get", "/api/v1/services", ServiceRecordService, "list", 500],
		["service update", "put", "/api/v1/services/s1", ServiceRecordService, "update", 500],
		["service delete", "delete", "/api/v1/services/s1", ServiceRecordService, "remove", 500],
		["service export", "get", "/api/v1/services/export", ServiceRecordService, "exportCSV", 500],
		["tracker tasks", "get", "/api/v1/vehicles/service-tasks", ServiceTrackerService, "listServiceTasks", 500],
		["tracker create task", "post", "/api/v1/vehicles/service-tasks", ServiceTrackerService, "getOrCreateServiceTask", 500],
		["tracker intervals", "get", "/api/v1/vehicles/v1/service-intervals", ServiceTrackerService, "getServiceIntervals", 500],
		["tracker save intervals", "post", "/api/v1/vehicles/v1/service-intervals", ServiceTrackerService, "saveServiceIntervals", 500],
		["tracker status", "get", "/api/v1/vehicles/v1/service-status", ServiceTrackerService, "getServiceStatus", 500],
		["tracker seed", "post", "/api/v1/vehicles/seed-test-data", ServiceTrackerService, "seedTestData", 500],
	];

	const bodies: Record<string, unknown> = {
		"tracker create task": { name: "Task" },
		"tracker save intervals": { intervals: [] },
	};

	it.each(generic)("%s returns %i on unexpected errors", async (label, method, url, service, fn, status) => {
		jest.spyOn(ServiceTrackerService, "getLatestOdometer").mockResolvedValue(0);
		jest.spyOn(service, fn).mockRejectedValue(new Error("db down"));
		const res = await send(method, url, bodies[label] ?? (method === "post" || method === "put" ? {} : undefined));
		expect(res.status).toBe(status);
	});

	const notFound: Case[] = [
		["vehicle update", "put", "/api/v1/vehicles/v1", VehicleService, "update", 404],
		["vehicle delete", "delete", "/api/v1/vehicles/v1", VehicleService, "remove", 404],
		["refuel update", "put", "/api/v1/refuels/r1", RefuelService, "update", 404],
		["refuel delete", "delete", "/api/v1/refuels/r1", RefuelService, "remove", 404],
		["service update", "put", "/api/v1/services/s1", ServiceRecordService, "update", 404],
		["service delete", "delete", "/api/v1/services/s1", ServiceRecordService, "remove", 404],
		["tracker intervals", "get", "/api/v1/vehicles/v1/service-intervals", ServiceTrackerService, "getServiceIntervals", 404],
		["tracker save intervals", "post", "/api/v1/vehicles/v1/service-intervals", ServiceTrackerService, "saveServiceIntervals", 404],
		["tracker status", "get", "/api/v1/vehicles/v1/service-status", ServiceTrackerService, "getServiceStatus", 404],
	];
	const notFoundMessage: Record<string, string> = { vehicle: "Vehicle not found", refuel: "Refuel not found", service: "Service record not found", tracker: "Vehicle not found" };

	it.each(notFound)("%s returns %i when the record is missing", async (label, method, url, service, fn, status) => {
		jest.spyOn(ServiceTrackerService, "getLatestOdometer").mockResolvedValue(0);
		jest.spyOn(service, fn).mockRejectedValue(new Error(notFoundMessage[label.split(" ")[0]]));
		const res = await send(method, url, bodies[label] ?? (method === "get" || method === "delete" ? undefined : {}));
		expect(res.status).toBe(status);
	});

	it.each([
		["vehicle", "/api/v1/vehicles/v1", VehicleService],
		["refuel", "/api/v1/refuels/r1", RefuelService],
		["service", "/api/v1/services/s1", ServiceRecordService],
	])("%s show returns 404 when missing", async (_label, url, service: any) => {
		jest.spyOn(service, "getById").mockResolvedValue(null);
		expect((await send("get", url)).status).toBe(404);
	});

	describe("validation", () => {
		it("requires a task name", async () => {
			expect((await send("post", "/api/v1/vehicles/service-tasks", { name: "  " })).status).toBe(400);
		});

		it("requires an intervals array", async () => {
			expect((await send("post", "/api/v1/vehicles/v1/service-intervals", { intervals: "nope" })).status).toBe(400);
		});

		it.each(["/api/v1/refuels/import", "/api/v1/services/import"])("%s rejects non-CSV bodies", async (url) => {
			expect((await send("post", url, { notCsv: true })).status).toBe(400);
		});

		it.each([
			["/api/v1/refuels/import", RefuelService],
			["/api/v1/services/import", ServiceRecordService],
		])("%s accepts a JSON csv property and reports import errors", async (url, service: any) => {
			const spy = jest.spyOn(service, "importCSV").mockResolvedValueOnce([{}]).mockRejectedValueOnce(new Error("Missing fuelType in CSV row"));
			const ok = await send("post", `${url}?vehicleId=v1`, { csv: "a,b\n1,2" });
			expect(ok.status).toBe(201);
			expect(spy).toHaveBeenCalledWith("u1", "a,b\n1,2", "v1");
			const bad = await send("post", url, { csv: "x" });
			expect(bad.status).toBe(400);
			expect(bad.body.message).toBe("Missing fuelType in CSV row");
		});
	});

	describe("service record photos", () => {
		it("stores base64 photos as files and keeps existing file names", async () => {
			const ensureDir = jest.spyOn(fs, "ensureDir").mockResolvedValue(undefined as never);
			const writeFile = jest.spyOn(fs, "writeFile").mockResolvedValue(undefined as never);
			const create = jest.spyOn(ServiceRecordService, "create").mockResolvedValue({ id: "s1" } as any);

			const res = await send("post", "/api/v1/services", {
				vehicleId: "v1",
				serviceType: "repair",
				cost: "10",
				mileage: "100",
				photos: ["data:image/jpeg;base64,QUJD", "/uploads/existing.png"],
			});

			expect(res.status).toBe(201);
			expect(ensureDir).toHaveBeenCalled();
			expect(writeFile).toHaveBeenCalledWith(expect.stringMatching(/\.jpeg$/), "QUJD", "base64");
			const photos = (create.mock.calls[0][0] as any).photos;
			expect(photos[0]).toMatch(/^[0-9a-f-]{36}\.jpeg$/);
			expect(photos[1]).toBe("existing.png");
		});
	});
});
