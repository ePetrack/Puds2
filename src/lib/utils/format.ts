export function formatCurrency(value?: number | string | null): string {
	if (value === undefined || value === null || value === '') return '-';
	const n = Number(value);
	if (isNaN(n)) return '-';
	return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function formatNumber(value?: number | string | null, decimals = 0): string {
	if (value === undefined || value === null || value === '') return '-';
	const n = Number(value);
	if (isNaN(n)) return '-';
	return n.toLocaleString('en-US', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	});
}

/** Format a YYYY-MM-DD date string without timezone drift. */
export function formatDateShort(value?: string | null): string {
	if (!value) return '-';
	const date = new Date(value.slice(0, 10) + 'T00:00:00');
	if (isNaN(date.getTime())) return '-';
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** "2026-07-01" → "Jul 2026". For month buckets, where a day-of-month would be noise. */
export function formatMonthYear(value?: string | null): string {
	if (!value) return '-';
	const date = new Date(value.slice(0, 7) + '-01T00:00:00');
	if (isNaN(date.getTime())) return '-';
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

/** "2026-07" → "Jul" */
export function formatMonthLabel(yearMonth: string): string {
	const date = new Date(yearMonth + '-01T00:00:00');
	if (isNaN(date.getTime())) return yearMonth;
	return date.toLocaleDateString('en-US', { month: 'short' });
}
