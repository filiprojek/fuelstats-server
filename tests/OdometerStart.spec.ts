import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { app } from "../src/app";
import OdometerRecord from "../src/models/OdometerRecord";
import OdometerService from "../src/services/OdometerService";
import env from "../src/config/environment";

const userId = "user123";

describe("start odometer record", () => {
	afterEach(() => jest.restoreAllMocks());

	describe("model", () => {
		it("is not a start record by default", () => {
			expect(new OdometerRecord({ userId, vehicleId: "v1", mileage: 1, date: new Date() }).isStart).toBe(false);
		});
	});

	describe("OdometerService", () => {
		beforeEach(() => {
			jest.spyOn(mongoose.Model.prototype, "save").mockImplementation(function (this: any) {
				this.createdAt = this.createdAt || new Date();
				return Promise.resolve(this);
			});
		});

		it("creates a start record when the vehicle has none", async () => {
			const exists = jest.spyOn(OdometerRecord, "exists").mockResolvedValue(null);
			const res = await OdometerService.create({ userId, vehicleId: "v1", mileage: 1000, isStart: true });
			expect(exists).toHaveBeenCalledWith({ userId, vehicleId: "v1", isStart: true });
			expect(res.isStart).toBe(true);
		});

		it("rejects a second start record for the same vehicle", async () => {
			jest.spyOn(OdometerRecord, "exists").mockResolvedValue({ _id: "other" } as any);
			await expect(OdometerService.create({ userId, vehicleId: "v1", mileage: 1000, isStart: true })).rejects.toMatchObject({ status: 409 });
		});

		it("does not check for regular records", async () => {
			const exists = jest.spyOn(OdometerRecord, "exists");
			const res = await OdometerService.create({ userId, vehicleId: "v1", mileage: 1000 });
			expect(exists).not.toHaveBeenCalled();
			expect(res.isStart).toBe(false);
		});

		it("returns isStart in lists", async () => {
			jest.spyOn(OdometerRecord, "find").mockReturnValue({
				sort: () => Promise.resolve([{ id: "o1", userId, vehicleId: "v1", mileage: 5, date: new Date(), isStart: true, createdAt: new Date() }]),
			} as any);
			const [r] = await OdometerService.list(userId, "v1");
			expect(r.isStart).toBe(true);
		});

		describe("update", () => {
			const current = { id: "o1", userId, vehicleId: "v1", isStart: false };

			beforeEach(() => {
				jest.spyOn(OdometerRecord, "findOneAndUpdate").mockImplementation(((_f: any, payload: any) =>
					Promise.resolve({ ...current, mileage: 1, date: new Date(), createdAt: new Date(), ...payload })) as any);
			});

			it("marks a record as start when no other start exists", async () => {
				jest.spyOn(OdometerRecord, "findOne").mockResolvedValue(current as any);
				const exists = jest.spyOn(OdometerRecord, "exists").mockResolvedValue(null);
				const res = await OdometerService.update("o1", userId, { isStart: true });
				expect(exists).toHaveBeenCalledWith({ userId, vehicleId: "v1", isStart: true, _id: { $ne: "o1" } });
				expect(res.isStart).toBe(true);
			});

			it("rejects marking when another start exists", async () => {
				jest.spyOn(OdometerRecord, "findOne").mockResolvedValue(current as any);
				jest.spyOn(OdometerRecord, "exists").mockResolvedValue({ _id: "o2" } as any);
				await expect(OdometerService.update("o1", userId, { isStart: true })).rejects.toMatchObject({ status: 409 });
				expect(OdometerRecord.findOneAndUpdate).not.toHaveBeenCalled();
			});

			it("checks the target vehicle when a start record moves to another vehicle", async () => {
				jest.spyOn(OdometerRecord, "findOne").mockResolvedValue({ ...current, isStart: true } as any);
				const exists = jest.spyOn(OdometerRecord, "exists").mockResolvedValue({ _id: "o9" } as any);
				await expect(OdometerService.update("o1", userId, { vehicleId: "v2" })).rejects.toMatchObject({ status: 409 });
				expect(exists).toHaveBeenCalledWith({ userId, vehicleId: "v2", isStart: true, _id: { $ne: "o1" } });
			});

			it("allows unmarking without checks", async () => {
				const exists = jest.spyOn(OdometerRecord, "exists");
				const res = await OdometerService.update("o1", userId, { isStart: false });
				expect(exists).not.toHaveBeenCalled();
				expect(res.isStart).toBe(false);
			});

			it("reports missing records as not found", async () => {
				jest.spyOn(OdometerRecord, "findOne").mockResolvedValue(null);
				await expect(OdometerService.update("o1", userId, { isStart: true })).rejects.toThrow("Odometer record not found");
			});
		});
	});

	describe("OdometerController", () => {
		const token = jwt.sign({ sub: userId, email: "u@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });
		const auth = { Authorization: `Bearer ${token}` };
		const conflict = () => Object.assign(new Error("This vehicle already has a start odometer record"), { status: 409 });

		it.each([
			[true, true],
			["true", true],
			[false, false],
			[undefined, false],
		])("passes isStart=%p on create", async (isStart, expected) => {
			const spy = jest.spyOn(OdometerService, "create").mockResolvedValue({ id: "o1" } as any);
			await request(app).post("/api/v1/odometer").set(auth).send({ vehicleId: "v1", mileage: 1, isStart });
			expect(spy.mock.calls[0][0].isStart).toBe(expected);
		});

		it("answers a duplicate start record with 409 on create", async () => {
			jest.spyOn(OdometerService, "create").mockRejectedValue(conflict());
			const res = await request(app).post("/api/v1/odometer").set(auth).send({ vehicleId: "v1", mileage: 1, isStart: true });
			expect(res.status).toBe(409);
			expect(res.body).toEqual({ message: "This vehicle already has a start odometer record" });
		});

		it("passes isStart on update only when provided", async () => {
			const spy = jest.spyOn(OdometerService, "update").mockResolvedValue({ id: "o1" } as any);
			await request(app).put("/api/v1/odometer/o1").set(auth).send({ isStart: false });
			expect(spy).toHaveBeenCalledWith("o1", userId, { isStart: false });
		});

		it("answers a duplicate start record with 409 on update", async () => {
			jest.spyOn(OdometerService, "update").mockRejectedValue(conflict());
			const res = await request(app).put("/api/v1/odometer/o1").set(auth).send({ isStart: true });
			expect(res.status).toBe(409);
		});
	});
});
