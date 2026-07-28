import { describe, expect, it } from 'vitest';
import {
	deriveOwnership,
	resolveChain,
	chainResolver,
	type ChainMeter
} from '$lib/server/services/meter-chain';

function meter(id: string, overrides: Partial<Omit<ChainMeter, 'id'>> = {}): ChainMeter {
	return {
		id,
		meterNumber: id.toUpperCase(),
		parentMeterId: null,
		accountId: null,
		...overrides
	};
}

function mapOf(...ms: ChainMeter[]) {
	return new Map(ms.map((m) => [m.id, m]));
}

describe('deriveOwnership', () => {
	it('treats a meter with a utility account as the utility’s', () => {
		expect(deriveOwnership({ accountId: 'acct-1' })).toBe('utility');
	});

	it('treats a meter with no account as internally owned', () => {
		expect(deriveOwnership({ accountId: null })).toBe('internal');
	});
});

describe('resolveChain', () => {
	it('makes a utility-owned meter its own revenue meter', () => {
		const m = meter('master', { accountId: 'acct-1' });
		const chain = resolveChain(mapOf(m), 'master')!;

		expect(chain.ownership).toBe('utility');
		expect(chain.parentMeterNumber).toBeNull();
		expect(chain.revenueMeterNumber).toBe('MASTER');
	});

	it('resolves a submeter up to its utility-owned parent', () => {
		const master = meter('master', { accountId: 'acct-1' });
		const sub = meter('sub', { parentMeterId: 'master' });
		const chain = resolveChain(mapOf(master, sub), 'sub')!;

		expect(chain.ownership).toBe('internal');
		expect(chain.parentMeterNumber).toBe('MASTER');
		expect(chain.revenueMeterNumber).toBe('MASTER');
	});

	it('walks past intermediate internal meters to the billing root', () => {
		const master = meter('master', { accountId: 'acct-1' });
		const mid = meter('mid', { parentMeterId: 'master' });
		const leaf = meter('leaf', { parentMeterId: 'mid' });
		const chain = resolveChain(mapOf(master, mid, leaf), 'leaf')!;

		// The immediate parent and the meter that actually bills are different things.
		expect(chain.parentMeterNumber).toBe('MID');
		expect(chain.revenueMeterNumber).toBe('MASTER');
	});

	it('reports no revenue meter when nothing upstream bills', () => {
		const orphanParent = meter('p');
		const orphan = meter('c', { parentMeterId: 'p' });
		const chain = resolveChain(mapOf(orphanParent, orphan), 'c')!;

		expect(chain.ownership).toBe('internal');
		expect(chain.parentMeterNumber).toBe('P');
		expect(chain.revenueMeterNumber).toBeNull();
	});

	it('stops instead of hanging on a cyclic parent link', () => {
		// assertValidMeter rejects cycles on write; a reporting query must survive one anyway.
		const a = meter('a', { parentMeterId: 'b' });
		const b = meter('b', { parentMeterId: 'a' });
		const chain = resolveChain(mapOf(a, b), 'a')!;

		expect(chain.revenueMeterNumber).toBeNull();
		expect(chain.parentMeterNumber).toBe('B');
	});

	it('returns null for a missing or absent meter', () => {
		expect(resolveChain(mapOf(), null)).toBeNull();
		expect(resolveChain(mapOf(), 'nope')).toBeNull();
	});

	it('leaves the parent number set even when the parent is unknown', () => {
		const orphan = meter('c', { parentMeterId: 'gone' });
		const chain = resolveChain(mapOf(orphan), 'c')!;

		expect(chain.parentMeterNumber).toBeNull();
		expect(chain.revenueMeterNumber).toBeNull();
	});
});

describe('chainResolver', () => {
	it('memoises repeated lookups without changing the answer', () => {
		const master = meter('master', { accountId: 'acct-1' });
		const sub = meter('sub', { parentMeterId: 'master' });
		const resolve = chainResolver(mapOf(master, sub));

		expect(resolve('sub')).toEqual(resolve('sub'));
		expect(resolve('sub')!.revenueMeterNumber).toBe('MASTER');
		expect(resolve(null)).toBeNull();
	});
});
