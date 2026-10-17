import { escapeRegex, exactCaseInsensitive } from "../src/utils/regex";

describe("regex utils", () => {
	it("escapes all regex metacharacters", () => {
		const raw = ".*+?^${}()|[]\\";
		expect(new RegExp(`^${escapeRegex(raw)}$`).test(raw)).toBe(true);
	});

	it("builds an exact, case-insensitive matcher", () => {
		const re = exactCaseInsensitive("Kontrola klimy (A/C)");
		expect(re.test("kontrola KLIMY (a/c)")).toBe(true);
		expect(re.test("Kontrola klimy A/C")).toBe(false);
		expect(re.test("xKontrola klimy (A/C)")).toBe(false);
	});

	it("does not throw for unbalanced input", () => {
		expect(() => exactCaseInsensitive("A/C (refill")).not.toThrow();
	});
});
