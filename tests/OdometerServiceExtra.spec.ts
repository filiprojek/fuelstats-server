import mongoose from "mongoose";
import OdometerRecord from "../src/models/OdometerRecord";
import OdometerService from "../src/services/OdometerService";

describe("OdometerService – edge cases", () => {
	afterEach(() => jest.restoreAllMocks());

	it("rethrows save errors", async () => {
		jest.spyOn(mongoose.Model.prototype, "save").mockRejectedValue(new Error("db"));
		await expect(OdometerService.create({ userId: "u", vehicleId: "v", mileage: 1 })).rejects.toThrow("db");
	});

	it("filters by vehicle unless 'all' is requested", async () => {
		const sort = jest.fn().mockResolvedValue([]);
		const find = jest.spyOn(OdometerRecord, "find").mockReturnValue({ sort } as any);
		await OdometerService.list("u", "v1");
		expect(find).toHaveBeenLastCalledWith({ userId: "u", vehicleId: "v1" });
		await OdometerService.list("u", "all");
		expect(find).toHaveBeenLastCalledWith({ userId: "u" });
		expect(sort).toHaveBeenCalledWith({ date: -1, createdAt: -1 });
	});

	it("rethrows list errors", async () => {
		jest.spyOn(OdometerRecord, "find").mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error("db")) } as any);
		await expect(OdometerService.list("u")).rejects.toThrow("db");
	});

	it("returns null for records of other users", async () => {
		jest.spyOn(OdometerRecord, "findOne").mockResolvedValue(null);
		await expect(OdometerService.getById("o1", "u")).resolves.toBeNull();
	});

	it("rethrows lookup errors", async () => {
		jest.spyOn(OdometerRecord, "findOne").mockRejectedValue(new Error("db"));
		await expect(OdometerService.getById("o1", "u")).rejects.toThrow("db");
	});

	it("throws not found on update and delete of missing records", async () => {
		jest.spyOn(OdometerRecord, "findOneAndUpdate").mockResolvedValue(null);
		jest.spyOn(OdometerRecord, "findOneAndDelete").mockResolvedValue(null);
		await expect(OdometerService.update("o1", "u", { mileage: 1 })).rejects.toThrow("Odometer record not found");
		await expect(OdometerService.remove("o1", "u")).rejects.toThrow("Odometer record not found");
	});

	it("rethrows unexpected update and delete errors", async () => {
		jest.spyOn(OdometerRecord, "findOneAndUpdate").mockRejectedValue(new Error("db1"));
		jest.spyOn(OdometerRecord, "findOneAndDelete").mockRejectedValue(new Error("db2"));
		await expect(OdometerService.update("o1", "u", {})).rejects.toThrow("db1");
		await expect(OdometerService.remove("o1", "u")).rejects.toThrow("db2");
	});
});
