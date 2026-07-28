/**
 * Resolving the meter-to-meter chain — pure, no database access, so it unit-tests
 * directly (same split as `bill-allocation-math.ts` vs `bill-allocation.ts`).
 *
 * Attribution in this domain runs **meter → meter**: a revenue meter feeds one or more
 * meters downstream of it, and that link is the physical connection point.
 * `meters.parent_meter_id` already expresses it, so walking that chain upward answers the
 * question reporting actually asks — *which meter does this consumption bill through?*
 *
 * This is about **billing**, not ownership. The revenue meter is the nearest ancestor with
 * a utility account, because that is the meter the utility invoices against. Who *owns* the
 * hardware is a separate, recorded fact (`meters.ownership`) and the two legitimately
 * disagree: a client-owned meter can be billed under a utility account, and a utility meter
 * may not be linked to one yet. Conflating them is exactly what `METER-1` removed.
 */

/** The minimum a meter must expose to take part in the chain. */
export interface ChainMeter {
	id: string;
	meterNumber: string;
	parentMeterId: string | null;
	accountId: string | null;
}

export interface MeterChain {
	/** Whether this meter is itself billed, i.e. carries a utility account. */
	billed: boolean;
	/** The meter directly upstream, if any. */
	parentMeterNumber: string | null;
	/** Nearest ancestor carrying an account — null when nothing upstream bills. */
	revenueMeterNumber: string | null;
}

const isBilled = (meter: Pick<ChainMeter, 'accountId'>) => meter.accountId != null;

/**
 * Resolve a meter's place in the chain.
 *
 * A meter that carries an account is its own revenue meter. Otherwise the parent chain is
 * walked upward to the first meter with one; a submeter whose whole chain is unbilled has
 * no revenue meter, which is a real (and reportable) gap rather than an error.
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

	const billed = isBilled(meter);
	const parent = meter.parentMeterId ? metersById.get(meter.parentMeterId) : undefined;

	let revenueMeterNumber: string | null = null;
	if (billed) {
		revenueMeterNumber = meter.meterNumber;
	} else {
		const seen = new Set<string>([meter.id]);
		let cursor = parent;
		while (cursor && !seen.has(cursor.id)) {
			seen.add(cursor.id);
			if (isBilled(cursor)) {
				revenueMeterNumber = cursor.meterNumber;
				break;
			}
			cursor = cursor.parentMeterId ? metersById.get(cursor.parentMeterId) : undefined;
		}
	}

	return {
		billed,
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
