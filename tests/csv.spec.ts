import { toCSV, parseCSV } from "../src/utils/csv";

describe("csv utils", () => {
	describe("toCSV", () => {
		it("returns an empty string for no rows", () => {
			expect(toCSV([])).toBe("");
		});

		it("writes a header row and values", () => {
			expect(toCSV([{ a: 1, b: "x" }, { a: 2, b: null }])).toBe("a,b\n1,x\n2,");
		});

		it("quotes values containing separators, quotes and newlines", () => {
			expect(toCSV([{ note: 'say "hi", ok' }, { note: "line1\nline2" }, { note: "cr\rhere" }])).toBe('note\n"say ""hi"", ok"\n"line1\nline2"\n"cr\rhere"');
		});
	});

	describe("parseCSV", () => {
		it("returns no rows for empty input", () => {
			expect(parseCSV("")).toEqual([]);
			expect(parseCSV("\n\n")).toEqual([]);
		});

		it("parses rows keyed by trimmed headers and values", () => {
			expect(parseCSV(" a , b \r\n1, x \r\n2,y")).toEqual([
				{ a: "1", b: "x" },
				{ a: "2", b: "y" },
			]);
		});

		it("handles quoted fields with commas, escaped quotes and newlines", () => {
			expect(parseCSV('note,n\n"say ""hi"", ok",1\n"multi\nline",2')).toEqual([
				{ note: 'say "hi", ok', n: "1" },
				{ note: "multi\nline", n: "2" },
			]);
		});

		it("fills missing trailing values with empty strings", () => {
			expect(parseCSV("a,b,c\n1")).toEqual([{ a: "1", b: "", c: "" }]);
		});

		it("round-trips toCSV output", () => {
			const rows = [{ name: "A, B", note: 'q"uote' }];
			expect(parseCSV(toCSV(rows))).toEqual(rows);
		});
	});
});
