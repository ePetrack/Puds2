/**
 * Minimal RFC 4180-style CSV parser: quoted fields, escaped quotes, CRLF.
 * Returns one object per row keyed by the header row.
 */
export function parseCSV(text: string): Record<string, string>[] {
	const rows: string[][] = [];
	let field = '';
	let row: string[] = [];
	let inQuotes = false;

	const pushField = () => {
		row.push(field);
		field = '';
	};
	const pushRow = () => {
		// Skip rows that are entirely empty
		if (row.length > 1 || row[0]?.trim() !== '') rows.push(row);
		row = [];
	};

	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (inQuotes) {
			if (c === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += c;
			}
		} else if (c === '"') {
			inQuotes = true;
		} else if (c === ',') {
			pushField();
		} else if (c === '\n') {
			pushField();
			pushRow();
		} else if (c !== '\r') {
			field += c;
		}
	}
	if (field !== '' || row.length > 0) {
		pushField();
		pushRow();
	}

	if (rows.length < 2) return [];

	const headers = rows[0].map((h) => h.trim());
	return rows.slice(1).map((values) => {
		const obj: Record<string, string> = {};
		headers.forEach((header, idx) => {
			obj[header] = (values[idx] ?? '').trim();
		});
		return obj;
	});
}
