import Vehicle from "../src/models/Vehicle";
import VehicleService from "../src/services/VehicleService";

describe("VehicleService – extra cases", () => {
	afterEach(() => jest.restoreAllMocks());

	it("returns the default vehicle", async () => {
		const v = { id: "v1", userId: "u", name: "Car", registrationPlate: "A", fuelType: "diesel", vin: null, note: null, isDefault: true, createdAt: new Date() };
		const findOne = jest.spyOn(Vehicle, "findOne").mockResolvedValue(v as any);
		await expect(VehicleService.getDefaultVehicle("u")).resolves.toMatchObject({ id: "v1", isDefault: true });
		expect(findOne).toHaveBeenCalledWith({ userId: "u", isDefault: true });
	});

	it("returns null without a default vehicle and rethrows errors", async () => {
		jest.spyOn(Vehicle, "findOne").mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("db"));
		await expect(VehicleService.getDefaultVehicle("u")).resolves.toBeNull();
		await expect(VehicleService.getDefaultVehicle("u")).rejects.toThrow("db");
	});

	it("rethrows unexpected update errors", async () => {
		jest.spyOn(Vehicle, "updateMany").mockResolvedValue({} as any);
		jest.spyOn(Vehicle, "findOneAndUpdate").mockRejectedValue(new Error("db"));
		await expect(VehicleService.update("v1", "u", { name: "x" } as any)).rejects.toThrow("db");
	});
});
