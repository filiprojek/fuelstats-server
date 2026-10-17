import ServiceRecord from "../src/models/ServiceRecord";
import ServiceTask from "../src/models/ServiceTask";
import ServiceLog from "../src/models/ServiceLog";
import ServiceRecordService from "../src/services/ServiceRecordService";
import VehicleService from "../src/services/VehicleService";

describe("ServiceRecordService CSV and log sync", () => {
	let taskQueries: any[];

	beforeEach(() => {
		taskQueries = [];
		jest.spyOn(console, "error").mockImplementation(() => {});
		jest.spyOn(VehicleService, "getById").mockImplementation(async (id: string) => (id === "v1" ? ({ id } as any) : null));
		jest.spyOn(ServiceRecord.prototype, "save").mockImplementation(function (this: any) {
			return Promise.resolve(this);
		});
		jest.spyOn(ServiceTask, "findOne").mockImplementation(((q: any) => {
			taskQueries.push(q);
			return Promise.resolve(null);
		}) as any);
		jest.spyOn(ServiceTask.prototype, "save").mockImplementation(function (this: any) {
			return Promise.resolve(this);
		});
		jest.spyOn(ServiceLog, "findOneAndUpdate").mockResolvedValue({} as any);
	});

	afterEach(() => jest.restoreAllMocks());

	describe("exportCSV", () => {
		it("exports records sorted by date", async () => {
			const sort = jest.fn().mockResolvedValue([
				{
					id: "s1",
					vehicleId: "v1",
					serviceType: "engine-oil",
					customType: null,
					itemName: "Castrol",
					cost: 2500,
					mileage: 10000,
					shop: null,
					selfService: true,
					note: null,
					photos: ["a.jpg", "b.jpg"],
					date: new Date("2026-01-02T00:00:00Z"),
					createdAt: new Date("2026-01-03T00:00:00Z"),
				},
				{
					id: "s2",
					vehicleId: "v1",
					serviceType: "repair",
					cost: 0,
					mileage: 1,
					selfService: false,
					date: new Date("2026-02-02T00:00:00Z"),
					createdAt: new Date("2026-02-03T00:00:00Z"),
				},
			]);
			const find = jest.spyOn(ServiceRecord, "find").mockReturnValue({ sort } as any);

			const csv = await ServiceRecordService.exportCSV("u", "v1");

			expect(find).toHaveBeenCalledWith({ userId: "u", vehicleId: "v1" });
			expect(sort).toHaveBeenCalledWith({ date: 1 });
			const lines = csv.split("\n");
			expect(lines[0]).toBe("id,vehicleId,serviceType,customType,itemName,cost,mileage,shop,selfService,note,photos,date,createdAt");
			expect(lines[1]).toBe("s1,v1,engine-oil,,Castrol,2500,10000,,true,,a.jpg;b.jpg,2026-01-02T00:00:00.000Z,2026-01-03T00:00:00.000Z");
			expect(lines[2]).toContain("s2,v1,repair,,,0,1,,false,,,");
		});

		it("exports all vehicles and rethrows errors", async () => {
			const find = jest.spyOn(ServiceRecord, "find").mockReturnValue({ sort: jest.fn().mockResolvedValue([]) } as any);
			await ServiceRecordService.exportCSV("u");
			expect(find).toHaveBeenCalledWith({ userId: "u" });
			find.mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error("db")) } as any);
			await expect(ServiceRecordService.exportCSV("u")).rejects.toThrow("db");
		});
	});

	describe("importCSV", () => {
		it("imports English headers and syncs the service log", async () => {
			const csv = "vehicleId,serviceType,cost,mileage,date,note,shop,selfService,photos,itemName,customType\nv1,engine-oil,2500,10000,2026-01-02,oil change,Garage,true,a.jpg; b.jpg,Castrol,";
			const [record] = await ServiceRecordService.importCSV("u", csv);

			expect(record).toMatchObject({
				vehicleId: "v1",
				serviceType: "engine-oil",
				cost: 2500,
				mileage: 10000,
				note: "oil change",
				shop: "Garage",
				selfService: true,
				itemName: "Castrol",
				photos: ["/uploads/a.jpg", "/uploads/b.jpg"],
			});
			expect(record.date).toEqual(new Date("2026-01-02"));
			expect(ServiceTask.prototype.save).toHaveBeenCalled();
			expect(taskQueries[0].name.$regex.test("Výměna motorového oleje a filtru")).toBe(true);
			expect(ServiceLog.findOneAndUpdate).toHaveBeenCalledWith(
				{ serviceRecordId: record.id },
				expect.objectContaining({ userId: "u", carId: "v1", odometer: 10000, price: 2500, note: "oil change" }),
				{ upsert: true, new: true },
			);
		});

		it("imports Czech headers with d.m.yyyy dates into the default vehicle", async () => {
			const csv = "servisní úkon,Cena,stav tachometru,datum,Poznámka,kód servisu/poskytovatel\ncabin-filter,,52000,5.3.2025,pyl,Servis XY";
			const [record] = await ServiceRecordService.importCSV("u", csv, "v1");
			expect(record).toMatchObject({ vehicleId: "v1", serviceType: "cabin-filter", cost: 0, mileage: 52000, note: "pyl", shop: "Servis XY", selfService: false, photos: [] });
			expect(record.date).toEqual(new Date(Date.UTC(2025, 2, 5)));
			expect(taskQueries[0].name.$regex.test("Výměna kabinového (mikro)filtru")).toBe(true);
		});

		it.each([
			["brake-pads-front", "Brzdová kapalina"],
			["air-filter", "Použití vzduch. Filtru"],
			["fuel-filter", "Palivový filtr"],
			["repair", "Kontrola vozidla"],
			["Timing belt", "Timing belt"],
		])("maps %s to the tracker task %s", async (type, task) => {
			await ServiceRecordService.importCSV("u", `vehicleId,serviceType,mileage,date\nv1,${type},1,2026-01-01`);
			expect(taskQueries[0].name.$regex.test(task)).toBe(true);
		});

		it("matches task names literally, not as regex", async () => {
			await ServiceRecordService.importCSV("u", "vehicleId,serviceType,mileage,date\nv1,A/C (refill,1,2026-01-01");
			const re: RegExp = taskQueries[0].name.$regex;
			expect(re.test("A/C (refill")).toBe(true);
			expect(re.test("a/c (REFILL")).toBe(true);
			expect(ServiceLog.findOneAndUpdate).toHaveBeenCalled();

			taskQueries = [];
			await ServiceRecordService.importCSV("u", "vehicleId,serviceType,mileage,date\nv1,air-filter,1,2026-01-01");
			expect(taskQueries[0].name.$regex.test("Použití vzduchX Filtru")).toBe(false);
		});

		it("reuses existing tracker tasks", async () => {
			(ServiceTask.findOne as jest.Mock).mockResolvedValue({ id: "t1" });
			await ServiceRecordService.importCSV("u", "vehicleId,serviceType,mileage,date\nv1,battery,1,2026-01-01");
			expect(ServiceTask.prototype.save).not.toHaveBeenCalled();
			expect(ServiceLog.findOneAndUpdate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ serviceTaskId: "t1" }), expect.anything());
		});

		it("does not fail the import when log sync fails", async () => {
			(ServiceLog.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error("log db"));
			await expect(ServiceRecordService.importCSV("u", "vehicleId,serviceType,mileage,date\nv1,battery,1,2026-01-01")).resolves.toHaveLength(1);
		});

		it.each([
			["serviceType,mileage,date\nbattery,1,2026-01-01", "Missing vehicleId"],
			["vehicleId,serviceType,mileage,date\nother,battery,1,2026-01-01", "not found or not owned"],
			["vehicleId,serviceType,mileage,date\nv1,,1,2026-01-01", "Missing serviceType"],
			["vehicleId,serviceType,mileage,date\nv1,battery,abc,2026-01-01", "mileage"],
			["vehicleId,serviceType,mileage,date\nv1,battery,1,", "Missing date"],
			["vehicleId,serviceType,mileage,date,cost\nv1,battery,1,2026-01-01,cheap", "Invalid cost"],
			["vehicleId,serviceType,mileage,date\nv1,battery,1,not-a-date", "Invalid date format"],
		])("rejects invalid rows (%#)", async (csv, message) => {
			await expect(ServiceRecordService.importCSV("u", csv)).rejects.toThrow(message);
		});
	});

	describe("remove", () => {
		it("deletes the linked service log, tolerating log failures", async () => {
			jest.spyOn(ServiceLog, "deleteOne").mockRejectedValue(new Error("log db"));
			jest.spyOn(ServiceRecord, "findOneAndDelete").mockResolvedValue({ id: "s1" } as any);
			await expect(ServiceRecordService.remove("s1", "u")).resolves.toBeUndefined();
			expect(ServiceLog.deleteOne).toHaveBeenCalledWith({ serviceRecordId: "s1" });
		});
	});
});
