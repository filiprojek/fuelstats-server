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


	describe("getById()", () => {
		const id = "veh1";

		it("returns vehicle payload when found", async () => {
			const now = new Date();
			const found = {
				id,
				userId: dto.userId,
				name: dto.name,
				registrationPlate: dto.registrationPlate,
				fuelType: dto.fuelType,
				note: dto.note,
				isDefault: dto.isDefault!,
				createdAt: now,
			};
			const spy = jest.spyOn(Vehicle, "findOne").mockResolvedValue(found as any);

			const result = await VehicleService.getById(id, dto.userId);

			expect(spy).toHaveBeenCalledWith({ _id: id, userId: dto.userId });
			expect(result).toEqual(found);
		});

		it("returns null when not found", async () => {
			jest.spyOn(Vehicle, "findOne").mockResolvedValue(null);

			const result = await VehicleService.getById(id, dto.userId);

			expect(result).toBeNull();
		});

		it("throws if the lookup fails", async () => {
			const error = new Error("DB failure");
			jest.spyOn(Vehicle, "findOne").mockRejectedValue(error);

			await expect(VehicleService.getById(id, dto.userId)).rejects.toThrow("DB failure");
		});
	});

	describe("list()", () => {
		it("returns vehicles for the user", async () => {
			const docs = [
				{
					id: "veh1",
					userId: dto.userId,
					name: "Car 1",
					registrationPlate: "ABC-123",
					fuelType: "petrol",
					note: "note",
					isDefault: false,
					createdAt: new Date(),
				},
			];
			const findSpy = jest.spyOn(Vehicle, "find").mockResolvedValue(docs as any);

			const res = await VehicleService.list(dto.userId);
			expect(findSpy).toHaveBeenCalledWith({ userId: dto.userId });
			expect(res).toEqual(docs);
		});

		it("throws if the find operation fails", async () => {
			const dbError = new Error("DB failure");
			jest.spyOn(Vehicle, "find").mockRejectedValue(dbError);

			await expect(VehicleService.list(dto.userId)).rejects.toThrow("DB failure");
		});
	});

	describe("update()", () => {
		const id = "veh123";
		const userId = dto.userId;
		const updatePayload = { name: "Updated Car", note: "Updated note" };

		it("should update an existing vehicle and return its details", async () => {
			const now = new Date();
			const updatedRecord = {
				id,
				userId,
				name: updatePayload.name,
				registrationPlate: dto.registrationPlate,
				fuelType: dto.fuelType,
				note: updatePayload.note,
				isDefault: dto.isDefault!,
				createdAt: now,
			};
			const spy = jest
				.spyOn(Vehicle, "findOneAndUpdate")
				.mockResolvedValue(updatedRecord as any);

			const result = await VehicleService.update(id, userId, updatePayload);

			expect(spy).toHaveBeenCalledWith({ _id: id, userId }, updatePayload, { new: true });
			expect(result).toEqual(updatedRecord);
		});

		it("should throw if the vehicle is not found", async () => {
			jest.spyOn(Vehicle, "findOneAndUpdate").mockResolvedValue(null as any);

			await expect(VehicleService.update(id, userId, updatePayload)).rejects.toThrow(
				"Vehicle not found",
			);
		});
	});
});

