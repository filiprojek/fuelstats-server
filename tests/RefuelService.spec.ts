import RefuelService, { CreateRefuelDTO } from "../src/services/RefuelService";
import Refuel from "../src/models/Refuel";

describe("RefuelService", () => {
        const dto: CreateRefuelDTO = {
                userId: "user1",
                vehicleId: "veh1",
                fuelType: "petrol",
                note: "Test refuel",
                liters: 50,
                pricePerLiter: 1.2,
                totalPrice: 60,
                mileage: 12345,
        };

        afterEach(() => {
                jest.restoreAllMocks();
        });

        describe("create()", () => {
                it("should save a new refuel and return its details", async () => {
                        const now = new Date();
                        const saveSpy = jest.spyOn(Refuel.prototype, "save").mockImplementation(function (this: any) {
                                this.createdAt = now;
                                return Promise.resolve(this);
                        });

                        const result = await RefuelService.create(dto);

                        expect(saveSpy).toHaveBeenCalled();
                        expect(typeof result.id).toBe("string");
                        expect(result).toMatchObject({
                                userId: dto.userId,
                                vehicleId: dto.vehicleId,
                                fuelType: dto.fuelType,
                                note: dto.note,
                                liters: dto.liters,
                                pricePerLiter: dto.pricePerLiter,
                                totalPrice: dto.totalPrice,
                                mileage: dto.mileage,
                                createdAt: now,
                        });
                });

                it("should throw if save fails", async () => {
                        const dbError = new Error("DB failure");
                        jest.spyOn(Refuel.prototype, "save").mockRejectedValue(dbError);
                        await expect(RefuelService.create(dto)).rejects.toThrow("DB failure");
                });
        });

        describe("getById()", () => {
                const id = "ref1";

                it("returns payload when found", async () => {
                        const now = new Date();
                        const found = {
                                id,
                                userId: dto.userId,
                                vehicleId: dto.vehicleId,
                                fuelType: dto.fuelType,
                                note: dto.note,
                                liters: dto.liters,
                                pricePerLiter: dto.pricePerLiter,
                                totalPrice: dto.totalPrice,
                                mileage: dto.mileage,
                                createdAt: now,
                        };
                        const spy = jest.spyOn(Refuel, "findOne").mockResolvedValue(found as any);

                        const result = await RefuelService.getById(id, dto.userId);
                        expect(spy).toHaveBeenCalledWith({ _id: id, userId: dto.userId });
                        expect(result).toEqual(found);
                });

                it("returns null when not found", async () => {
                        jest.spyOn(Refuel, "findOne").mockResolvedValue(null);
                        const result = await RefuelService.getById(id, dto.userId);
                        expect(result).toBeNull();
                });

                it("throws if lookup fails", async () => {
                        const err = new Error("DB failure");
                        jest.spyOn(Refuel, "findOne").mockRejectedValue(err);
                        await expect(RefuelService.getById(id, dto.userId)).rejects.toThrow("DB failure");
                });
        });

        describe("list()", () => {
                it("returns refuels for user", async () => {
                        const docs = [
                                {
                                        id: "r1",
                                        userId: dto.userId,
                                        vehicleId: dto.vehicleId,
                                        fuelType: dto.fuelType,
                                        note: dto.note,
                                        liters: dto.liters,
                                        pricePerLiter: dto.pricePerLiter,
                                        totalPrice: dto.totalPrice,
                                        mileage: dto.mileage,
                                        createdAt: new Date(),
                                },
                        ];
                        const spy = jest.spyOn(Refuel, "find").mockResolvedValue(docs as any);
                        const res = await RefuelService.list(dto.userId);
                        expect(spy).toHaveBeenCalledWith({ userId: dto.userId });
                        expect(res).toEqual(docs);
                });

                it("throws if find fails", async () => {
                        const dbError = new Error("DB failure");
                        jest.spyOn(Refuel, "find").mockRejectedValue(dbError);
                        await expect(RefuelService.list(dto.userId)).rejects.toThrow("DB failure");
                });
        });

        describe("update()", () => {
                const id = "ref123";
                const userId = dto.userId;
                const updatePayload = { note: "updated" };

                it("updates and returns payload", async () => {
                        const now = new Date();
                        const updated = {
                                id,
                                userId,
                                vehicleId: dto.vehicleId,
                                fuelType: dto.fuelType,
                                note: updatePayload.note,
                                liters: dto.liters,
                                pricePerLiter: dto.pricePerLiter,
                                totalPrice: dto.totalPrice,
                                mileage: dto.mileage,
                                createdAt: now,
                        };
                        const spy = jest.spyOn(Refuel, "findOneAndUpdate").mockResolvedValue(updated as any);
                        const result = await RefuelService.update(id, userId, updatePayload);
                        expect(spy).toHaveBeenCalledWith({ _id: id, userId }, updatePayload, { new: true });
                        expect(result).toEqual(updated);
                });

                it("throws when not found", async () => {
                        jest.spyOn(Refuel, "findOneAndUpdate").mockResolvedValue(null as any);
                        await expect(RefuelService.update(id, userId, updatePayload)).rejects.toThrow("Refuel not found");
                });
        });

        describe("remove()", () => {
                const id = "ref123";
                const userId = dto.userId;

                it("deletes refuel", async () => {
                        const spy = jest.spyOn(Refuel, "findOneAndDelete").mockResolvedValue({ id } as any);
                        await RefuelService.remove(id, userId);
                        expect(spy).toHaveBeenCalledWith({ _id: id, userId });
                });

                it("throws if not found", async () => {
                        jest.spyOn(Refuel, "findOneAndDelete").mockResolvedValue(null);
                        await expect(RefuelService.remove(id, userId)).rejects.toThrow("Refuel not found");
                });

                it("throws if delete fails", async () => {
                        const dbError = new Error("DB failure");
                        jest.spyOn(Refuel, "findOneAndDelete").mockRejectedValue(dbError);
                        await expect(RefuelService.remove(id, userId)).rejects.toThrow("DB failure");
                });
        });
});
