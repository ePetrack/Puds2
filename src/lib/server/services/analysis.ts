import { desc, eq, gte } from 'drizzle-orm';
import { db } from '../db';
import {
	utilityBills,
	utilityAccounts,
	utilityProviders,
	energyReadings,
	meters,
	buildings,
	clients
} from '../db/schema';

/**
 * Flattened bill + reading rows for interactive pivoting. One record shape for
 * both sources so Perspective can group across them.
 */
export interface AnalysisRecord {
	record_type: 'bill' | 'reading';
	date: string;
	month: string;
	year: number;
	client: string | null;
	building: string | null;
	provider: string | null;
	account_number: string | null;
	meter_number: string | null;
	utility_type: string | null;
	usage: number | null;
	unit: string | null;
	demand_kw: number | null;
	cost: number | null;
}

const num = (v: string | null): number | null => (v === null || v === '' ? null : Number(v));

export async function getAnalysisDataset(monthsBack = 24): Promise<AnalysisRecord[]> {
	const cutoff = new Date();
	cutoff.setMonth(cutoff.getMonth() - monthsBack);
	const cutoffStr = cutoff.toISOString().split('T')[0];

	const [billRows, readingRows] = await Promise.all([
		db
			.select({
				date: utilityBills.periodEnd,
				usage: utilityBills.usage,
				unit: utilityBills.unit,
				demandKw: utilityBills.demandKw,
				cost: utilityBills.totalCost,
				accountNumber: utilityAccounts.accountNumber,
				utilityType: utilityAccounts.utilityType,
				clientName: clients.name,
				providerName: utilityProviders.name,
				meterNumber: meters.meterNumber,
				buildingName: buildings.name
			})
			.from(utilityBills)
			.leftJoin(utilityAccounts, eq(utilityBills.accountId, utilityAccounts.id))
			.leftJoin(clients, eq(utilityAccounts.clientId, clients.id))
			.leftJoin(utilityProviders, eq(utilityAccounts.providerId, utilityProviders.id))
			.leftJoin(meters, eq(utilityBills.meterId, meters.id))
			.leftJoin(buildings, eq(meters.buildingId, buildings.id))
			.where(gte(utilityBills.periodEnd, cutoffStr))
			.orderBy(desc(utilityBills.periodEnd)),
		db
			.select({
				date: energyReadings.readingDate,
				usage: energyReadings.usage,
				demandKw: energyReadings.demandKw,
				cost: energyReadings.cost,
				meterNumber: meters.meterNumber,
				meterUnit: meters.unit,
				utilityType: meters.utilityType,
				buildingName: buildings.name,
				clientName: clients.name
			})
			.from(energyReadings)
			.leftJoin(meters, eq(energyReadings.meterId, meters.id))
			.leftJoin(buildings, eq(meters.buildingId, buildings.id))
			.leftJoin(clients, eq(buildings.clientId, clients.id))
			.where(gte(energyReadings.readingDate, cutoffStr))
			.orderBy(desc(energyReadings.readingDate))
	]);

	const records: AnalysisRecord[] = [];

	for (const b of billRows) {
		records.push({
			record_type: 'bill',
			date: b.date,
			month: b.date.slice(0, 7),
			year: Number(b.date.slice(0, 4)),
			client: b.clientName,
			building: b.buildingName,
			provider: b.providerName,
			account_number: b.accountNumber,
			meter_number: b.meterNumber,
			utility_type: b.utilityType,
			usage: num(b.usage),
			unit: b.unit,
			demand_kw: num(b.demandKw),
			cost: num(b.cost)
		});
	}

	for (const r of readingRows) {
		records.push({
			record_type: 'reading',
			date: r.date,
			month: r.date.slice(0, 7),
			year: Number(r.date.slice(0, 4)),
			client: r.clientName,
			building: r.buildingName,
			provider: null,
			account_number: null,
			meter_number: r.meterNumber,
			utility_type: r.utilityType,
			usage: num(r.usage),
			unit: r.meterUnit,
			demand_kw: num(r.demandKw),
			cost: num(r.cost)
		});
	}

	return records;
}
