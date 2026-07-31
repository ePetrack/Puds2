import { listMeters } from '$lib/server/services/meters';
import { optionalUuid } from '$lib/utils/uuid';
import { listBuildings } from '$lib/server/services/buildings';
import { listComplexes } from '$lib/server/services/complexes';
import { listAccounts } from '$lib/server/services/utility-accounts';
import { listClients } from '$lib/server/services/clients';
import { UTILITY_TYPES, METER_OWNERSHIPS } from '$lib/schemas/utility';
import type { Meter } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

/**
 * Ownership is **recorded** on the meter (`meters.ownership`), not inferred from whether an
 * account is attached. The two genuinely differ: a client-owned meter can be billed under a
 * utility account, and a utility meter may not be linked to one yet. Meters whose ownership
 * has never been recorded read as `unknown` and are surfaced as a gap rather than guessed at.
 */
export type Ownership = Meter['ownership'];

export interface ConnectionMeter {
	id: string;
	meterNumber: string;
	utilityType: Meter['utilityType'];
	unit: Meter['unit'];
	status: Meter['status'];
	ownership: Ownership;
	accountId: string | null;
	accountNumber: string | null;
	providerName: string | null;
	parentMeterId: string | null;
	parentMeterNumber: string | null;
	submeterCount: number;
}

export interface PremiseGroup {
	key: string;
	name: string;
	kind: 'building' | 'complex' | 'unassigned';
	clientName: string | null;
	href: string | null;
	utilityMeters: ConnectionMeter[];
	internalMeters: ConnectionMeter[];
	unknownMeters: ConnectionMeter[];
}

export const load: PageServerLoad = async ({ url }) => {
	const clientId = optionalUuid(url.searchParams.get('client')) ?? '';
	const typeParam = url.searchParams.get('type') ?? '';
	const ownershipParam = url.searchParams.get('ownership') ?? '';

	const utilityType = (UTILITY_TYPES as readonly string[]).includes(typeParam)
		? (typeParam as Meter['utilityType'])
		: undefined;

	const [allMeters, buildingsPage, complexesPage, accounts, clientsPage] = await Promise.all([
		listMeters({ utilityType }),
		listBuildings({ perPage: 100 }),
		listComplexes({ perPage: 100 }),
		listAccounts({ clientId: clientId || undefined }),
		listClients({ perPage: 100 })
	]);

	// Premise → client, so a client filter can reach meters (which carry no client of their own).
	const buildingClient = new Map(buildingsPage.items.map((b) => [b.id, b.client]));
	const complexClient = new Map(complexesPage.items.map((c) => [c.id, c.client]));
	const buildingComplex = new Map(buildingsPage.items.map((b) => [b.id, b.complexId]));

	// Provider comes from the account, which listMeters doesn't join. When a client filter
	// is active `accounts` is narrowed, so provider lookup uses the unfiltered set.
	const allAccounts = clientId ? await listAccounts() : accounts;
	const accountById = new Map(allAccounts.map((a) => [a.id, a]));

	const submeterCounts = new Map<string, number>();
	for (const m of allMeters) {
		if (m.parentMeterId) {
			submeterCounts.set(m.parentMeterId, (submeterCounts.get(m.parentMeterId) ?? 0) + 1);
		}
	}

	const clientOf = (m: (typeof allMeters)[number]) =>
		m.buildingId
			? (buildingClient.get(m.buildingId) ?? null)
			: m.complexId
				? (complexClient.get(m.complexId) ?? null)
				: null;

	const scoped = allMeters.filter((m) => !clientId || clientOf(m)?.id === clientId);

	const toConnection = (m: (typeof allMeters)[number]): ConnectionMeter => {
		const account = m.accountId ? accountById.get(m.accountId) : undefined;
		return {
			id: m.id,
			meterNumber: m.meterNumber,
			utilityType: m.utilityType,
			unit: m.unit,
			status: m.status,
			ownership: m.ownership,
			accountId: m.accountId,
			accountNumber: account?.accountNumber ?? m.accountNumber,
			providerName: account?.providerName ?? null,
			parentMeterId: m.parentMeterId,
			parentMeterNumber: m.parentMeterNumber,
			submeterCount: submeterCounts.get(m.id) ?? 0
		};
	};

	const groups = new Map<string, PremiseGroup>();
	for (const m of scoped) {
		const key = m.buildingId
			? `b:${m.buildingId}`
			: m.complexId
				? `c:${m.complexId}`
				: 'unassigned';
		let group = groups.get(key);
		if (!group) {
			const client = clientOf(m);
			group = {
				key,
				name: m.premiseName ?? 'No premise',
				kind: m.buildingId ? 'building' : m.complexId ? 'complex' : 'unassigned',
				clientName: client?.name ?? null,
				href: m.buildingId
					? `/buildings/${m.buildingId}`
					: m.complexId
						? `/complexes/${m.complexId}`
						: null,
				utilityMeters: [],
				internalMeters: [],
				unknownMeters: []
			};
			groups.set(key, group);
		}
		const conn = toConnection(m);
		if (conn.ownership === 'utility') group.utilityMeters.push(conn);
		else if (conn.ownership === 'client') group.internalMeters.push(conn);
		else group.unknownMeters.push(conn);
	}

	// The ownership filter hides the other columns rather than dropping whole premises.
	const ownership: Ownership | '' = (METER_OWNERSHIPS as readonly string[]).includes(ownershipParam)
		? (ownershipParam as Ownership)
		: '';

	const premises = [...groups.values()]
		.map((g) => ({
			...g,
			utilityMeters: ownership && ownership !== 'utility' ? [] : g.utilityMeters,
			internalMeters: ownership && ownership !== 'client' ? [] : g.internalMeters,
			unknownMeters: ownership && ownership !== 'unknown' ? [] : g.unknownMeters
		}))
		.filter(
			(g) => g.utilityMeters.length > 0 || g.internalMeters.length > 0 || g.unknownMeters.length > 0
		)
		.sort((a, b) => a.name.localeCompare(b.name));

	// --- Gaps: the audit value of this page -------------------------------------------
	const metersWithAccount = new Set(scoped.filter((m) => m.accountId).map((m) => m.accountId!));
	const meterById = new Map(allMeters.map((m) => [m.id, m]));

	const unattributed = scoped
		.filter((m) => !m.accountId && !m.parentMeterId)
		.map((m) => ({ id: m.id, meterNumber: m.meterNumber, premiseName: m.premiseName }));

	const unrecordedOwnership = scoped
		.filter((m) => m.ownership === 'unknown')
		.map((m) => ({ id: m.id, meterNumber: m.meterNumber, premiseName: m.premiseName }));

	const accountsWithoutMeters = accounts
		.filter((a) => !metersWithAccount.has(a.id))
		.map((a) => ({
			id: a.id,
			accountNumber: a.accountNumber,
			providerName: a.providerName,
			clientName: a.clientName
		}));

	// A submeter should sit on (or under) the same premise as its parent; a mismatch is
	// usually a data-entry error, and it silently corrupts any submetered allocation.
	const premiseMismatches = scoped
		.filter((m) => m.parentMeterId)
		.map((m) => ({ meter: m, parent: meterById.get(m.parentMeterId!) }))
		.filter(({ meter, parent }) => {
			if (!parent) return false;
			if (parent.buildingId) return meter.buildingId !== parent.buildingId;
			// A complex master legitimately parents meters on the buildings it serves.
			if (parent.complexId) {
				if (meter.complexId === parent.complexId) return false;
				return !(meter.buildingId && buildingComplex.get(meter.buildingId) === parent.complexId);
			}
			return false;
		})
		.map(({ meter, parent }) => ({
			id: meter.id,
			meterNumber: meter.meterNumber,
			premiseName: meter.premiseName,
			parentMeterNumber: parent!.meterNumber,
			parentPremiseName: parent!.premiseName
		}));

	return {
		premises,
		gaps: { unattributed, unrecordedOwnership, accountsWithoutMeters, premiseMismatches },
		counts: {
			meters: scoped.length,
			utility: scoped.filter((m) => m.ownership === 'utility').length,
			internal: scoped.filter((m) => m.ownership === 'client').length,
			unknown: scoped.filter((m) => m.ownership === 'unknown').length,
			accounts: accounts.length
		},
		clientOptions: clientsPage.items.map((c) => ({ id: c.id, name: c.name })),
		filters: { client: clientId, type: typeParam, ownership: ownershipParam }
	};
};
