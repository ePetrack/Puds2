/**
 * Idempotent seed script.
 *
 * Usage: npm run db:seed   (reads .env if present)
 *
 * Creates demo users, clients, and buildings. Safe to run repeatedly.
 */
process.env.ALLOW_SIGNUP = 'true'; // seed provisions users through the auth API

import { eq } from 'drizzle-orm';

async function main() {
	// Import after ALLOW_SIGNUP is set so the auth instance permits sign-up
	const { auth } = await import('../src/lib/server/auth');
	const { db } = await import('../src/lib/server/db');
	const { user, clients, buildings } = await import('../src/lib/server/db/schema');

	console.log('🌱 Seeding database...\n');

	// 1. Users
	const seedUsers = [
		{ email: 'admin@demo.com', password: 'admin123!', name: 'Admin User', role: 'admin' },
		{
			email: 'sarah@energy.com',
			password: 'password123!',
			name: 'Sarah Johnson',
			role: 'consultant'
		},
		{ email: 'mike@energy.com', password: 'password123!', name: 'Mike Chen', role: 'consultant' },
		{ email: 'viewer@demo.com', password: 'viewer123!', name: 'Read Only', role: 'client' }
	];

	for (const u of seedUsers) {
		const existing = await db.query.user.findFirst({ where: eq(user.email, u.email) });
		if (existing) {
			console.log(`  ⏭️  user ${u.email} already exists`);
			continue;
		}
		await auth.api.signUpEmail({
			body: { email: u.email, password: u.password, name: u.name }
		});
		await db.update(user).set({ role: u.role }).where(eq(user.email, u.email));
		console.log(`  ✅ user ${u.email} (${u.role})`);
	}

	// 2. Clients
	const seedClients = [
		{
			name: 'State University',
			contactName: 'Dr. Robert Williams',
			contactEmail: 'r.williams@stateu.edu',
			contactPhone: '555-0101',
			address: '123 University Ave',
			city: 'University City',
			state: 'CA',
			zip: '90210',
			status: 'active' as const,
			contractStartDate: '2026-01-01',
			contractEndDate: '2027-12-31',
			contractValue: '250000'
		},
		{
			name: 'Tech College',
			contactName: 'Jane Martinez',
			contactEmail: 'j.martinez@techcollege.edu',
			contactPhone: '555-0202',
			address: '456 Tech Blvd',
			city: 'Innovation City',
			state: 'TX',
			zip: '75001',
			status: 'active' as const,
			contractStartDate: '2025-06-01',
			contractEndDate: '2026-05-31',
			contractValue: '180000'
		}
	];

	const clientIds: Record<string, string> = {};
	for (const c of seedClients) {
		const existing = await db.query.clients.findFirst({ where: eq(clients.name, c.name) });
		if (existing) {
			clientIds[c.name] = existing.id;
			console.log(`  ⏭️  client ${c.name} already exists`);
			continue;
		}
		const [created] = await db.insert(clients).values(c).returning();
		clientIds[c.name] = created.id;
		console.log(`  ✅ client ${c.name}`);
	}

	// 3. Buildings
	const seedBuildings = [
		{
			client: 'State University',
			name: 'Science Hall',
			buildingType: 'laboratory' as const,
			squareFootage: 85000,
			yearBuilt: 1985,
			floors: 4,
			occupancy: 350
		},
		{
			client: 'State University',
			name: 'Student Center',
			buildingType: 'dining' as const,
			squareFootage: 120000,
			yearBuilt: 2005,
			floors: 3,
			occupancy: 800
		},
		{
			client: 'State University',
			name: 'Main Library',
			buildingType: 'library' as const,
			squareFootage: 95000,
			yearBuilt: 1978,
			floors: 5,
			occupancy: 500
		},
		{
			client: 'Tech College',
			name: 'Engineering Building',
			buildingType: 'academic' as const,
			squareFootage: 75000,
			yearBuilt: 1995,
			floors: 6,
			occupancy: 300
		}
	];

	const buildingIds: Record<string, string> = {};
	for (const b of seedBuildings) {
		const existing = await db.query.buildings.findFirst({ where: eq(buildings.name, b.name) });
		if (existing) {
			buildingIds[b.name] = existing.id;
			console.log(`  ⏭️  building ${b.name} already exists`);
			continue;
		}
		const { client, ...rest } = b;
		const [created] = await db
			.insert(buildings)
			.values({ ...rest, clientId: clientIds[client] })
			.returning();
		buildingIds[b.name] = created.id;
		console.log(`  ✅ building ${b.name}`);
	}

	// 4. Utility management data
	const { utilityProviders, rateSchedules, utilityAccounts, meters, utilityBills } =
		await import('../src/lib/server/db/schema');

	const existingProviders = await db.select().from(utilityProviders);
	if (existingProviders.length > 0) {
		console.log('  ⏭️  utility data already exists, skipping');
	} else {
		const [cityPower] = await db
			.insert(utilityProviders)
			.values({
				name: 'City Power & Light',
				utilityTypes: ['electricity'],
				accountManager: 'Dana Reyes',
				phone: '555-0330',
				email: 'accounts@citypl.example.com',
				website: 'https://citypl.example.com'
			})
			.returning();
		const [metroGas] = await db
			.insert(utilityProviders)
			.values({
				name: 'Metro Gas',
				utilityTypes: ['natural_gas'],
				accountManager: 'Tom Alvarez',
				phone: '555-0440',
				email: 'service@metrogas.example.com'
			})
			.returning();
		console.log('  ✅ 2 utility providers');

		const [gs2Rate] = await db
			.insert(rateSchedules)
			.values({
				providerId: cityPower.id,
				name: 'GS-2 General Service',
				utilityType: 'electricity',
				rateType: 'demand',
				energyRate: '0.115',
				demandRate: '12.5',
				fixedMonthlyCharge: '45',
				unit: 'kWh',
				effectiveDate: '2025-01-01'
			})
			.returning();
		const [gasRate] = await db
			.insert(rateSchedules)
			.values({
				providerId: metroGas.id,
				name: 'Commercial Firm Service',
				utilityType: 'natural_gas',
				rateType: 'flat',
				energyRate: '1.11',
				fixedMonthlyCharge: '28.5',
				unit: 'therms',
				effectiveDate: '2025-01-01'
			})
			.returning();
		console.log('  ✅ 2 rate schedules');

		const [elecAccount] = await db
			.insert(utilityAccounts)
			.values({
				clientId: clientIds['State University'],
				providerId: cityPower.id,
				accountNumber: '100-2345-678',
				utilityType: 'electricity',
				status: 'active',
				rateScheduleId: gs2Rate.id,
				serviceAddress: '123 University Ave',
				startDate: '2025-01-01'
			})
			.returning();
		const [gasAccount] = await db
			.insert(utilityAccounts)
			.values({
				clientId: clientIds['State University'],
				providerId: metroGas.id,
				accountNumber: '200-8765-432',
				utilityType: 'natural_gas',
				status: 'active',
				rateScheduleId: gasRate.id,
				serviceAddress: '123 University Ave',
				startDate: '2025-01-01'
			})
			.returning();
		console.log('  ✅ 2 utility accounts');

		const [elecMeter] = await db
			.insert(meters)
			.values({
				buildingId: buildingIds['Science Hall'],
				accountId: elecAccount.id,
				meterNumber: 'MTR-ELEC-001',
				utilityType: 'electricity',
				unit: 'kwh',
				status: 'active',
				multiplier: '1',
				location: 'Basement mechanical room'
			})
			.returning();
		const [gasMeter] = await db
			.insert(meters)
			.values({
				buildingId: buildingIds['Science Hall'],
				accountId: gasAccount.id,
				meterNumber: 'MTR-GAS-001',
				utilityType: 'natural_gas',
				unit: 'therms',
				status: 'active',
				multiplier: '1',
				location: 'North exterior wall'
			})
			.returning();
		console.log('  ✅ 2 meters');

		// 12 months of bills per account with seasonal shape
		const today = new Date();
		let billCount = 0;
		const fmt = (d: Date) => d.toISOString().split('T')[0];
		for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
			const periodStart = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
			const periodEnd = new Date(today.getFullYear(), today.getMonth() - monthsAgo + 1, 0);
			const statementDate = new Date(periodEnd.getTime() + 5 * 86400000);
			const dueDate = new Date(periodEnd.getTime() + 25 * 86400000);
			const month = periodStart.getMonth();
			// Electric peaks in summer, gas peaks in winter
			const summerFactor = 1 + 0.35 * Math.cos(((month - 6) / 12) * 2 * Math.PI);
			const winterFactor = 1 + 0.6 * Math.cos((month / 12) * 2 * Math.PI);

			const elecUsage = Math.round(40000 * summerFactor + Math.random() * 2000);
			const elecDemand = Math.round(160 * summerFactor + Math.random() * 10);
			const energyCharge = elecUsage * 0.115;
			const demandCharge = elecDemand * 12.5;
			const elecTaxes = (energyCharge + demandCharge + 45) * 0.06;
			await db.insert(utilityBills).values({
				accountId: elecAccount.id,
				meterId: elecMeter.id,
				statementDate: fmt(statementDate),
				periodStart: fmt(periodStart),
				periodEnd: fmt(periodEnd),
				dueDate: fmt(dueDate),
				usage: String(elecUsage),
				unit: 'kWh',
				demandKw: String(elecDemand),
				energyCharge: energyCharge.toFixed(2),
				demandCharge: demandCharge.toFixed(2),
				fixedCharge: '45',
				taxesFees: elecTaxes.toFixed(2),
				totalCost: (energyCharge + demandCharge + 45 + elecTaxes).toFixed(2),
				status: monthsAgo <= 1 ? 'pending' : 'paid',
				paymentDate: monthsAgo <= 1 ? null : fmt(dueDate),
				readingType: 'actual'
			});
			billCount++;

			const gasUsage = Math.round(2800 * winterFactor + Math.random() * 200);
			const gasEnergyCharge = gasUsage * 1.11;
			const gasTaxes = (gasEnergyCharge + 28.5) * 0.06;
			await db.insert(utilityBills).values({
				accountId: gasAccount.id,
				meterId: gasMeter.id,
				statementDate: fmt(statementDate),
				periodStart: fmt(periodStart),
				periodEnd: fmt(periodEnd),
				dueDate: fmt(dueDate),
				usage: String(gasUsage),
				unit: 'therms',
				energyCharge: gasEnergyCharge.toFixed(2),
				fixedCharge: '28.5',
				taxesFees: gasTaxes.toFixed(2),
				totalCost: (gasEnergyCharge + 28.5 + gasTaxes).toFixed(2),
				status: monthsAgo <= 1 ? 'pending' : 'paid',
				paymentDate: monthsAgo <= 1 ? null : fmt(dueDate),
				readingType: 'actual'
			});
			billCount++;
		}
		console.log(`  ✅ ${billCount} utility bills`);
	}

	// 5. Projects
	const { projects, projectBuildings, energyReadings } =
		await import('../src/lib/server/db/schema');

	const existingProjects = await db.select().from(projects);
	if (existingProjects.length > 0) {
		console.log('  ⏭️  projects already exist, skipping');
	} else {
		const [hvac] = await db
			.insert(projects)
			.values({
				clientId: clientIds['State University'],
				name: 'HVAC Upgrade - Science Hall',
				description: 'Replace aging air handlers and add variable frequency drives.',
				status: 'in_progress',
				startDate: '2026-03-01',
				endDate: '2026-12-31',
				budget: '450000',
				actualCost: '280000',
				expectedAnnualSavings: '65000',
				roiYears: '6.9'
			})
			.returning();
		await db.insert(projectBuildings).values({
			projectId: hvac.id,
			buildingId: buildingIds['Science Hall']
		});

		const [led] = await db
			.insert(projects)
			.values({
				clientId: clientIds['State University'],
				name: 'LED Lighting Retrofit - Campus Wide',
				description: 'Campus-wide LED conversion with occupancy controls.',
				status: 'completed',
				startDate: '2025-09-01',
				endDate: '2026-02-28',
				budget: '180000',
				actualCost: '165000',
				expectedAnnualSavings: '42000',
				actualAnnualSavings: '45000',
				roiYears: '3.7'
			})
			.returning();
		await db.insert(projectBuildings).values([
			{ projectId: led.id, buildingId: buildingIds['Science Hall'] },
			{ projectId: led.id, buildingId: buildingIds['Student Center'] },
			{ projectId: led.id, buildingId: buildingIds['Main Library'] }
		]);
		console.log('  ✅ 2 projects');
	}

	// 6. Energy readings (12 months per seeded meter, mirroring bill seasonality)
	const existingReadings = await db.select().from(energyReadings).limit(1);
	if (existingReadings.length > 0) {
		console.log('  ⏭️  energy readings already exist, skipping');
	} else {
		const seededMeters = await db.select().from(meters);
		let readingCount = 0;
		const rToday = new Date();
		for (const meter of seededMeters) {
			for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
				const periodEnd = new Date(rToday.getFullYear(), rToday.getMonth() - monthsAgo + 1, 0);
				const month = periodEnd.getMonth();
				const isElectric = meter.utilityType === 'electricity';
				const factor = isElectric
					? 1 + 0.35 * Math.cos(((month - 6) / 12) * 2 * Math.PI)
					: 1 + 0.6 * Math.cos((month / 12) * 2 * Math.PI);
				const base = isElectric ? 40000 : 2800;
				const usage = Math.round(base * factor + Math.random() * base * 0.05);
				await db.insert(energyReadings).values({
					meterId: meter.id,
					readingDate: periodEnd.toISOString().split('T')[0],
					usage: String(usage),
					demandKw: isElectric ? String(Math.round(160 * factor)) : null,
					readingType: 'actual',
					source: 'csv_import'
				});
				readingCount++;
			}
		}
		console.log(`  ✅ ${readingCount} energy readings`);
	}

	console.log('\n🎉 Seeding complete. Log in with admin@demo.com / admin123!');
	process.exit(0);
}

main().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
