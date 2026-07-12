export function toCSV(rows: Array<Record<string, any>>): string {
	if (rows.length === 0) return "";
	const headers = Object.keys(rows[0]);
	const csvRows = [headers.join(",")];
	for (const row of rows) {
		const values = headers.map((header) => {
			const val = row[header];
			const stringVal = val === null || val === undefined ? "" : String(val);
			if (stringVal.includes(",") || stringVal.includes('"') || stringVal.includes("\n") || stringVal.includes("\r")) {
				return `"${stringVal.replace(/"/g, '""')}"`;
			}
			return stringVal;
		});
		csvRows.push(values.join(","));
	}
	return csvRows.join("\n");
}

export function parseCSV(csv: string): Array<Record<string, string>> {
	const lines: string[] = [];
	let currentLine = "";
	let inQuotes = false;

	for (let i = 0; i < csv.length; i++) {
		const char = csv[i];
		if (char === '"') {
			inQuotes = !inQuotes;
			currentLine += char;
		} else if ((char === "\n" || char === "\r") && !inQuotes) {
			if (currentLine.trim()) {
				lines.push(currentLine);
			}
			currentLine = "";
		} else {
			currentLine += char;
		}
	}
	if (currentLine.trim()) {
		lines.push(currentLine);
	}

	if (lines.length === 0) return [];
	const headers = parseCSVLine(lines[0]);
	const results: Array<Record<string, string>> = [];

	for (let i = 1; i < lines.length; i++) {
		const values = parseCSVLine(lines[i]);
		const row: Record<string, string> = {};
		headers.forEach((header, index) => {
			row[header.trim()] = values[index] !== undefined ? values[index].trim() : "";
		});
		results.push(row);
	}
	return results;
}

function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let currentVal = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				currentVal += '"';
				i++; // skip next quote
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === "," && !inQuotes) {
			result.push(currentVal);
			currentVal = "";
		} else {
			currentVal += char;
		}
	}
	result.push(currentVal);
	return result;
}
