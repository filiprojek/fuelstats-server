import VehicleService, { CreateVehicleDTO } from "../src/services/VehicleService";
import Vehicle from "../src/models/Vehicle";

describe("VehicleService", () => {
	const dto: CreateVehicleDTO = {
		userId: "user1",
		name: "My Car",
		registrationPlate: "ABC-123",
		fuelType: "petrol",
		note: "Test vehicle",
		isDefault: true,
	};

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("create()", () => {
		it("should save a new vehicle and return its details", async () => {
			const now = new Date();
			// Stub save to only set createdAt; leave Mongoose's default id
			const saveSpy = jest.spyOn(Vehicle.prototype, "save").mockImplementation(function (this: any) {
				this.createdAt = now;
				return Promise.resolve(this);
			});

			const result = await VehicleService.create(dto);

			// Ensure we called save()
			expect(saveSpy).toHaveBeenCalled();

			// id should be a non-empty string
			expect(typeof result.id).toBe("string");
			expect(result.id).not.toHaveLength(0);

			// All other fields match the DTO + createdAt
			expect(result).toMatchObject({
				userId: dto.userId,
				name: dto.name,
				registrationPlate: dto.registrationPlate,
				fuelType: dto.fuelType,
				note: dto.note,
				isDefault: dto.isDefault!,
				createdAt: now,
			});
		});

		it("should throw if the save operation fails", async () => {
			const dbError = new Error("DB failure");
			jest.spyOn(Vehicle.prototype, "save").mockRejectedValue(dbError);

			await expect(VehicleService.create(dto)).rejects.toThrow("DB failure");
		});
	});
});
