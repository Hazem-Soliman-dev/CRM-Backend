function escapeCsvValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	let str = String(value);
	// Escape quotes by doubling them
	if (str.includes('"')) {
		str = str.replace(/"/g, '""');
	}
	// Wrap in quotes if it contains delimiter, quotes, or newlines
	if (/[",\n\r]/.test(str)) {
		str = `"${str}"`;
	}
	return str;
}

export function buildCsvBufferFromJson(rows: Array<Record<string, any>>): Buffer {
	const safeRows = Array.isArray(rows) ? rows : [];
	if (safeRows.length === 0) {
		return Buffer.from("\uFEFF"); // BOM for Excel
	}
	const headers = Object.keys(safeRows[0]);
	const lines: string[] = [];
	lines.push(headers.map(escapeCsvValue).join(","));
	for (const row of safeRows) {
		const line = headers.map((h) => escapeCsvValue(row[h])).join(",");
		lines.push(line);
	}
	const csv = "\uFEFF" + lines.join("\r\n");
	return Buffer.from(csv, "utf8");
}


