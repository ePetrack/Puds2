/**
 * Reconciliation status vocabulary, shared client/server.
 *
 * The wording lives beside the union rather than in the page, because how a status is
 * *described* is part of the analysis: calling partial coverage an "error" would train
 * operators to dismiss the report, and calling an impossible reading a "warning" would
 * bury the one case that always needs chasing. The classification itself is in
 * `src/lib/server/services/reconciliation-math.ts`.
 */

export const RECONCILIATION_STATUSES = [
	'balanced',
	'unaccounted',
	'over_metered',
	'no_master',
	'no_submeters'
] as const;

export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export const STATUS_LABEL: Record<ReconciliationStatus, { label: string; meaning: string }> = {
	balanced: {
		label: 'Balanced',
		meaning: 'Submeters account for the master within tolerance.'
	},
	unaccounted: {
		label: 'Unaccounted',
		meaning:
			'The master read more than its submeters. Expected wherever coverage is partial — common area, house load or distribution loss — and only a concern if it grows.'
	},
	over_metered: {
		label: 'Over-metered',
		meaning:
			'Submeters read more than the master, which is not physically possible. Check for a meter parented to the wrong master, a double-counted submeter, or reads that fall outside the master’s period.'
	},
	no_master: {
		label: 'No master read',
		meaning: 'No master reading for this period, so there is nothing to reconcile against.'
	},
	no_submeters: {
		label: 'No submeter reads',
		meaning: 'The master reported but no submeter did, so coverage for this period is zero.'
	}
};
