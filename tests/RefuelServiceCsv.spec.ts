import { Types } from "mongoose";
import Refuel from "../src/models/Refuel";
import RefuelService, { REFUEL_CSV_COLUMNS } from "../src/services/RefuelService";
import VehicleService from "../src/services/VehicleService";
import { fakeStore } from "./helpers/fakeStore";

describe("RefuelService CSV", () => {
	afterEach(() => jest.restoreAllMocks());

	describe("exportCSV", () => {
		const refuel = (extra = {}) => ({
			id: "r1",
			vehicleId: "v1",
			fuelType: "diesel",
			note: "a, b",
			liters: 40,
			pricePerLiter: 38.5,
			totalPrice: 1540,
			mileage: 10000,
			date: new Date("2026-01-02T00:00:00Z"),
			createdAt: new Date("2026-01-03T00:00:00Z"),
			...extra,
		});

		it("exports refuels sorted by mileage with quoting", async () => {
			const sort = jest.fn().mockResolvedValue([refuel(), refuel({ id: "r2", note: null, date: undefined })]);
			const find = jest.spyOn(Refuel, "find").mockReturnValue({ sort } as any);

			const csv = await RefuelService.exportCSV("u", "v1");

			expect(find).toHaveBeenCalledWith({ userId: "u", vehicleId: "v1" });
			expect(sort).toHaveBeenCalledWith({ mileage: 1 });
			expect(csv.split("\n")).toEqual([
				"id,vehicleId,fuelType,note,liters,pricePerLiter,totalPrice,mileage,date,createdAt",
				'r1,v1,diesel,"a, b",40,38.5,1540,10000,2026-01-02T00:00:00.000Z,2026-01-03T00:00:00.000Z',
				"r2,v1,diesel,,40,38.5,1540,10000,2026-01-03T00:00:00.000Z,2026-01-03T00:00:00.000Z",
			]);
		});

		it("exports all vehicles without a filter, keeping the header when there are no refuels", async () => {
			const find = jest.spyOn(Refuel, "find").mockReturnValue({ sort: jest.fn().mockResolvedValue([]) } as any);
			await expect(RefuelService.exportCSV("u")).resolves.toBe(REFUEL_CSV_COLUMNS.join(","));
			expect(find).toHaveBeenCalledWith({ userId: "u" });
		});

		it("rethrows errors", async () => {
			jest.spyOn(Refuel, "find").mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error("db")) } as any);
			await expect(RefuelService.exportCSV("u")).rejects.toThrow("db");
		});
	});

	describe("importCSV", () => {
		const header = "vehicleId,fuelType,note,liters,pricePerLiter,totalPrice,mileage,date,createdAt";
		const exportHeader = REFUEL_CSV_COLUMNS.join(",");
		const existingId = new Types.ObjectId().toString();
		const existing = {
			_id: existingId,
			userId: "u",
			vehicleId: "v1",
			fuelType: "diesel",
			liters: 40,
			pricePerLiter: 38.5,
			totalPrice: 1540,
			mileage: 10000,
			date: new Date("2026-01-02T00:00:00Z"),
		};
		let store: ReturnType<typeof fakeStore>;
		let getById: jest.SpyInstance;

		beforeEach(() => {
			getById = jest.spyOn(VehicleService, "getById").mockImplementation(async (id: string) => (["v1", "v2", "def"].includes(id) ? ({ id } as any) : null));
			store = fakeStore(Refuel);
		});

		it("imports rows using the row vehicle or the default", async () => {
			const csv = `${header}\nv1,diesel,first,40,38.5,1540,10000,2026-01-02T00:00:00Z,\n,diesel,,30,40,1200,10500,,2026-02-01T00:00:00Z`;
			const { records, skipped } = await RefuelService.importCSV("u", csv, "def");
			expect(skipped).toBe(0);
			expect(records).toHaveLength(2);
			expect(records[0]).toMatchObject({ userId: "u", vehicleId: "v1", liters: 40, note: "first", mileage: 10000 });
			expect(records[0].date).toEqual(new Date("2026-01-02T00:00:00Z"));
			expect(records[1]).toMatchObject({ vehicleId: "def", note: undefined });
			expect(records[1].date).toEqual(new Date("2026-02-01T00:00:00Z"));
		});

		describe("target vehicle", () => {
			it("imports every row into the target vehicle, ignoring the row vehicle and the default", async () => {
				const csv = `${header}\nother,diesel,,40,38.5,1540,10000,,\n,diesel,,30,40,1200,10500,,`;
				const { records } = await RefuelService.importCSV("u", csv, "def", "v2");
				expect(records.map((r) => r.vehicleId)).toEqual(["v2", "v2"]);
				expect(getById).toHaveBeenCalledTimes(1);
				expect(getById).toHaveBeenCalledWith("v2", "u");
			});

			it("rejects a target vehicle the user does not own before importing anything", async () => {
				const csv = `${header}\nv1,diesel,,40,38.5,1540,10000,,`;
				await expect(RefuelService.importCSV("u", csv, undefined, "other")).rejects.toThrow("Vehicle with ID other not found or not owned by user");
				expect(store.docs).toHaveLength(0);
			});
		});

		describe("skipping rows already present", () => {
			it("skips a row whose id exists in the same vehicle, even if it was edited since the export", async () => {
				store.seed({ ...existing, liters: 41, totalPrice: 1578.5 });
				const csv = `${exportHeader}\n${existingId},v1,diesel,,40,38.5,1540,10000,2026-01-02T00:00:00.000Z,`;
				const { records, skipped } = await RefuelService.importCSV("u", csv);
				expect(records).toHaveLength(0);
				expect(skipped).toBe(1);
				expect(store.docs).toHaveLength(1);
			});

			it("copies a row whose id belongs to another vehicle into the target vehicle", async () => {
				store.seed(existing);
				const csv = `${exportHeader}\n${existingId},v1,diesel,,40,38.5,1540,10000,2026-01-02T00:00:00.000Z,`;
				const { records, skipped } = await RefuelService.importCSV("u", csv, undefined, "v2");
				expect(skipped).toBe(0);
				expect(records).toHaveLength(1);
				expect(records[0]).toMatchObject({ vehicleId: "v2", mileage: 10000 });
				expect(records[0].id).not.toBe(existingId);
			});

			it("does not import the same file into the target vehicle twice", async () => {
				const csv = [
					exportHeader,
					`${new Types.ObjectId()},v1,diesel,,40,38.5,1540,10000,2026-01-02T00:00:00.000Z,`,
					`${new Types.ObjectId()},v1,diesel,,30,40,1200,10500,2026-02-01T00:00:00.000Z,`,
				].join("\n");

				const first = await RefuelService.importCSV("u", csv, undefined, "v2");
				const second = await RefuelService.importCSV("u", csv, undefined, "v2");

				expect(first).toMatchObject({ skipped: 0, records: [{ mileage: 10000 }, { mileage: 10500 }] });
				expect(second).toEqual({ records: [], skipped: 2 });
				expect(store.docs).toHaveLength(2);
			});

			it("skips rows without an id that match an existing refuel", async () => {
				store.seed(existing);
				const csv = `${header}\nv1,diesel,changed note,40,38.5,1540,10000,,\nv1,diesel,,40,38.5,1540,10001,,`;
				const { records, skipped } = await RefuelService.importCSV("u", csv);
				expect(skipped).toBe(1);
				expect(records.map((r) => r.mileage)).toEqual([10001]);
			});

			it("does not treat a refuel in another vehicle or of another user as a match", async () => {
				store.seed({ ...existing, vehicleId: "v2" }, { ...existing, _id: new Types.ObjectId(), userId: "someone-else" });
				const csv = `${header}\nv1,diesel,,40,38.5,1540,10000,,`;
				const { records, skipped } = await RefuelService.importCSV("u", csv);
				expect(skipped).toBe(0);
				expect(records).toHaveLength(1);
			});

			it("imports identical rows of one file, and on a repeat import matches each existing refuel only once", async () => {
				const row = "v1,diesel,,40,38.5,1540,10000,,";
				const first = await RefuelService.importCSV("u", `${header}\n${row}\n${row}`);
				expect(first.records).toHaveLength(2);

				const second = await RefuelService.importCSV("u", `${header}\n${row}\n${row}\n${row}`);
				expect(second.skipped).toBe(2);
				expect(second.records).toHaveLength(1);
				expect(store.docs).toHaveLength(3);
			});

			it("ignores ids that are not ObjectIds", async () => {
				const csv = `${exportHeader}\nr1,v1,diesel,,40,38.5,1540,10000,,`;
				const { records, skipped } = await RefuelService.importCSV("u", csv);
				expect(skipped).toBe(0);
				expect(records).toHaveLength(1);
			});
		});

		it.each([
			[`${header}\n,diesel,,1,1,1,1,,`, undefined, "Missing vehicleId"],
			[`${header}\nother,diesel,,1,1,1,1,,`, undefined, "not found or not owned"],
			[`${header}\nv1,,,1,1,1,1,,`, undefined, "Missing fuelType"],
			[`${header}\nv1,diesel,,x,1,1,1,,`, undefined, "liters"],
			[`${header}\nv1,diesel,,1,,1,1,,`, undefined, "pricePerLiter"],
			[`${header}\nv1,diesel,,1,1,abc,1,,`, undefined, "totalPrice"],
			[`${header}\nv1,diesel,,1,1,1,,,`, undefined, "mileage"],
		])("rejects invalid rows (%#)", async (csv, def, message) => {
			await expect(RefuelService.importCSV("u", csv, def)).rejects.toThrow(message);
		});
	});
});
