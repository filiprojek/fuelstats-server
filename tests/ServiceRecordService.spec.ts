import ServiceRecordService, { CreateServiceRecordDTO } from "../src/services/ServiceRecordService";
import ServiceRecord from "../src/models/ServiceRecord";

describe("ServiceRecordService", () => {
        const photoName = "img.jpg";
        const photoUrl = `/uploads/${photoName}`;
        const dto: CreateServiceRecordDTO = {
                userId: "user1",
                vehicleId: "veh1",
                serviceType: "oil_filter",
                itemName: "OEM",
                cost: 50,
                mileage: 12000,
                date: new Date("2024-01-01"),
                shop: "Home",
                selfService: true,
                note: "Changed oil filter",
                photos: [photoName],
        };

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("create()", () => {
		it("saves a new record and returns payload", async () => {
			const now = new Date();
			const saveSpy = jest.spyOn(ServiceRecord.prototype, "save").mockImplementation(function (this: any) {
				this.createdAt = now;
				return Promise.resolve(this);
			});

                        const result = await ServiceRecordService.create(dto);

                        expect(saveSpy).toHaveBeenCalled();
                        expect(result).toMatchObject({
                                userId: dto.userId,
                                vehicleId: dto.vehicleId,
                                serviceType: dto.serviceType,
                                itemName: dto.itemName,
                                cost: dto.cost,
                                mileage: dto.mileage,
                                shop: dto.shop,
                                selfService: dto.selfService,
                                note: dto.note,
                                photos: [photoUrl],
                                date: dto.date,
                                createdAt: now,
                        });
                });

		it("throws if save fails", async () => {
			const err = new Error("DB failure");
			jest.spyOn(ServiceRecord.prototype, "save").mockRejectedValue(err);
			await expect(ServiceRecordService.create(dto)).rejects.toThrow("DB failure");
		});
	});

	describe("getById()", () => {
		const id = "srv1";
		it("returns payload when found", async () => {
                        const now = new Date();
                        const found = { ...dto, id, createdAt: now };
                        const spy = jest.spyOn(ServiceRecord, "findOne").mockResolvedValue(found as any);
                        const result = await ServiceRecordService.getById(id, dto.userId);
                        expect(spy).toHaveBeenCalledWith({ _id: id, userId: dto.userId });
                        expect(result).toEqual({
                                id,
                                userId: dto.userId,
                                vehicleId: dto.vehicleId,
                                serviceType: dto.serviceType,
                                itemName: dto.itemName,
                                cost: dto.cost,
                                mileage: dto.mileage,
                                date: dto.date,
                                shop: dto.shop,
                                selfService: dto.selfService,
                                note: dto.note,
                                photos: [photoUrl],
                                createdAt: now,
                        });
                });

		it("returns null when not found", async () => {
			jest.spyOn(ServiceRecord, "findOne").mockResolvedValue(null);
			const result = await ServiceRecordService.getById(id, dto.userId);
			expect(result).toBeNull();
		});

		it("throws if lookup fails", async () => {
			const err = new Error("DB failure");
			jest.spyOn(ServiceRecord, "findOne").mockRejectedValue(err);
			await expect(ServiceRecordService.getById(id, dto.userId)).rejects.toThrow("DB failure");
		});
	});

	describe("list()", () => {
		it("returns records for user", async () => {
                        const docs = [{ ...dto, id: "r1", createdAt: new Date() }];
                        const spy = jest.spyOn(ServiceRecord, "find").mockResolvedValue(docs as any);
                        const res = await ServiceRecordService.list(dto.userId);
                        expect(spy).toHaveBeenCalledWith({ userId: dto.userId });
                        expect(res).toEqual([
                                {
                                        id: "r1",
                                        userId: dto.userId,
                                        vehicleId: dto.vehicleId,
                                        serviceType: dto.serviceType,
                                        itemName: dto.itemName,
                                        cost: dto.cost,
                                        mileage: dto.mileage,
                                        shop: dto.shop,
                                        selfService: dto.selfService,
                                        note: dto.note,
                                        photos: [photoUrl],
                                        date: dto.date,
                                        createdAt: docs[0].createdAt,
                                },
                        ]);
                });

		it("throws if find fails", async () => {
			const err = new Error("DB failure");
			jest.spyOn(ServiceRecord, "find").mockRejectedValue(err);
			await expect(ServiceRecordService.list(dto.userId)).rejects.toThrow("DB failure");
		});
	});

	describe("update()", () => {
		const id = "srv123";
		const userId = dto.userId;
		const updatePayload = { note: "updated" };

		it("updates and returns payload", async () => {
                        const now = new Date();
                        const updated = { ...dto, ...updatePayload, id, createdAt: now };
                        const spy = jest.spyOn(ServiceRecord, "findOneAndUpdate").mockResolvedValue(updated as any);
                        const result = await ServiceRecordService.update(id, userId, updatePayload);
                        expect(spy).toHaveBeenCalledWith({ _id: id, userId }, updatePayload, { new: true });
                        expect(result).toEqual({
                                ...updatePayload,
                                id,
                                userId: dto.userId,
                                vehicleId: dto.vehicleId,
                                serviceType: dto.serviceType,
                                itemName: dto.itemName,
                                cost: dto.cost,
                                mileage: dto.mileage,
                                shop: dto.shop,
                                selfService: dto.selfService,
                                note: updatePayload.note,
                                photos: [photoUrl],
                                date: dto.date,
                                createdAt: now,
                        });
                });

		it("throws when not found", async () => {
			jest.spyOn(ServiceRecord, "findOneAndUpdate").mockResolvedValue(null as any);
			await expect(ServiceRecordService.update(id, userId, updatePayload)).rejects.toThrow("Service record not found");
		});
	});

	describe("remove()", () => {
		const id = "srv123";
		const userId = dto.userId;

		it("deletes record", async () => {
			const spy = jest.spyOn(ServiceRecord, "findOneAndDelete").mockResolvedValue({ id } as any);
			await ServiceRecordService.remove(id, userId);
			expect(spy).toHaveBeenCalledWith({ _id: id, userId });
		});

		it("throws if not found", async () => {
			jest.spyOn(ServiceRecord, "findOneAndDelete").mockResolvedValue(null);
			await expect(ServiceRecordService.remove(id, userId)).rejects.toThrow("Service record not found");
		});

		it("throws if delete fails", async () => {
			const err = new Error("DB failure");
			jest.spyOn(ServiceRecord, "findOneAndDelete").mockRejectedValue(err);
			await expect(ServiceRecordService.remove(id, userId)).rejects.toThrow("DB failure");
		});
	});
});
