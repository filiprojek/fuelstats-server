import Refuel from "../src/models/Refuel";
import RefuelService from "../src/services/RefuelService";
import VehicleService from "../src/services/VehicleService";

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

		it("exports all vehicles without a filter", async () => {
			const find = jest.spyOn(Refuel, "find").mockReturnValue({ sort: jest.fn().mockResolvedValue([]) } as any);
			await expect(RefuelService.exportCSV("u")).resolves.toBe("");
			expect(find).toHaveBeenCalledWith({ userId: "u" });
		});

		it("rethrows errors", async () => {
			jest.spyOn(Refuel, "find").mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error("db")) } as any);
			await expect(RefuelService.exportCSV("u")).rejects.toThrow("db");
		});
	});

	describe("importCSV", () => {
		const header = "vehicleId,fuelType,note,liters,pricePerLiter,totalPrice,mileage,date,createdAt";

		beforeEach(() => {
			jest.spyOn(VehicleService, "getById").mockImplementation(async (id: string) => (id === "v1" || id === "def" ? ({ id } as any) : null));
			jest.spyOn(Refuel.prototype, "save").mockImplementation(function (this: any) {
				return Promise.resolve(this);
			});
		});

		it("imports rows using the row vehicle or the default", async () => {
			const csv = `${header}\nv1,diesel,first,40,38.5,1540,10000,2026-01-02T00:00:00Z,\n,diesel,,30,40,1200,10500,,2026-02-01T00:00:00Z`;
			const result = await RefuelService.importCSV("u", csv, "def");
			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({ userId: "u", vehicleId: "v1", liters: 40, note: "first", mileage: 10000 });
			expect(result[0].date).toEqual(new Date("2026-01-02T00:00:00Z"));
			expect(result[1]).toMatchObject({ vehicleId: "def", note: undefined });
			expect(result[1].date).toEqual(new Date("2026-02-01T00:00:00Z"));
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
