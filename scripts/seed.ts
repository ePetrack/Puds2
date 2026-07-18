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

	for (const b of seedBuildings) {
		const existing = await db.query.buildings.findFirst({ where: eq(buildings.name, b.name) });
		if (existing) {
			console.log(`  ⏭️  building ${b.name} already exists`);
			continue;
		}
		const { client, ...rest } = b;
		await db.insert(buildings).values({ ...rest, clientId: clientIds[client] });
		console.log(`  ✅ building ${b.name}`);
	}

	console.log('\n🎉 Seeding complete. Log in with admin@demo.com / admin123!');
	process.exit(0);
}

main().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
