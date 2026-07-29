import { describe, expect, it } from 'vitest';
import { listHref } from '$lib/utils/pagination';

describe('listHref', () => {
	it('keeps the base path clean on page one', () => {
		expect(listHref('/clients', {}, 1)).toBe('/clients');
		expect(listHref('/clients', {})).toBe('/clients');
	});

	it('carries the active filters through a page change', () => {
		expect(listHref('/clients', { search: 'acme', status: 'active' }, 3)).toBe(
			'/clients?search=acme&status=active&page=3'
		);
	});

	it('omits blank, null and undefined filters entirely', () => {
		// A blank filter is "no filter" — carrying `search=` through would make the URL claim a
		// constraint that isn't there.
		expect(listHref('/buildings', { search: '', client: null, campus: undefined }, 2)).toBe(
			'/buildings?page=2'
		);
	});

	it('escapes values that would otherwise break the query string', () => {
		expect(listHref('/clients', { search: 'a&b c' })).toBe('/clients?search=a%26b%20c');
	});

	it('keeps a zero, which is a real filter value rather than an empty one', () => {
		expect(listHref('/energy', { threshold: 0 })).toBe('/energy?threshold=0');
	});
});
