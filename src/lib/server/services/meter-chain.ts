/**
 * Resolving the meter-to-meter chain — pure, no database access, so it unit-tests
 * directly (same split as `bill-allocation-math.ts` vs `bill-allocation.ts`).
 *
 * Attribution in this domain runs **meter → meter**: a utility-owned revenue meter feeds
 * one or more internally-owned meters, and that link is the physical connection point.
 * `meters.parent_meter_id` already expresses it, so walking that chain upward answers the
 * question reporting actually asks — *which meter does this consumption bill through?*
 */

/** The minimum a meter must expose to take part in the chain. */
export interface ChainMeter {
	id: string;
	meterNumber: string;
	parentMeterId: string | null;
	accountId: string | null;
}

export type MeterOwnership = 'utility' | 'internal';

export interface MeterChain {
	ownership: MeterOwnership;
	/** The meter directly upstream, if any. */
	parentMeterNumber: string | null;
	/** Nearest utility-owned ancestor — null when nothing upstream bills. */
	revenueMeterNumber: string | null;
}

/**
 * Ownership is **derived, not recorded**. `meters` has no ownership column; a meter billed
 * under a utility account is in practice the utility's revenue meter, and one without is
 * the client's own. Wrong in two real cases — a client-owned meter the utility happens to
 * bill against, and a utility meter not yet linked to an account — which is why `METER-1`
 * replaces this with a stored enum. Keep the heuristic here so that swap has one call site.
 */
export function deriveOwnership(meter: Pick<ChainMeter, 'accountId'>): MeterOwnership {
	return meter.accountId ? 'utility' : 'internal';
}

/**
 * Resolve a meter's place in the chain.
 *
 * A utility-owned meter is its own revenue meter. Otherwise the parent chain is walked
 * upward to the first meter with an account; a submeter whose whole chain is internally
 * owned has no revenue meter, which is a real (and reportable) gap rather than an error.
 *
 * `assertValidMeter` rejects cycles on write, but a visited set guards this anyway — a
 * reporting query must not hang on a row that predates that rule or was edited by hand.
 */
export function resolveChain(
	metersById: Map<string, ChainMeter>,
	meterId: string | null
): MeterChain | null {
	if (!meterId) return null;
	const meter = metersById.get(meterId);
	if (!meter) return null;

	const ownership = deriveOwnership(meter);
	const parent = meter.parentMeterId ? metersById.get(meter.parentMeterId) : undefined;

	let revenueMeterNumber: string | null = null;
	if (ownership === 'utility') {
		revenueMeterNumber = meter.meterNumber;
	} else {
		const seen = new Set<string>([meter.id]);
		let cursor = parent;
		while (cursor && !seen.has(cursor.id)) {
			seen.add(cursor.id);
			if (deriveOwnership(cursor) === 'utility') {
				revenueMeterNumber = cursor.meterNumber;
				break;
			}
			cursor = cursor.parentMeterId ? metersById.get(cursor.parentMeterId) : undefined;
		}
	}

	return {
		ownership,
		parentMeterNumber: parent?.meterNumber ?? null,
		revenueMeterNumber
	};
}

/**
 * A `resolveChain` bound to one meter map and memoised, for callers resolving the same
 * meters across thousands of rows.
 */
export function chainResolver(
	metersById: Map<string, ChainMeter>
): (meterId: string | null) => MeterChain | null {
	const cache = new Map<string, MeterChain | null>();
	return (meterId) => {
		if (!meterId) return null;
		if (!cache.has(meterId)) cache.set(meterId, resolveChain(metersById, meterId));
		return cache.get(meterId)!;
	};
}
