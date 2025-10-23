/**
 * Seed script for PocketBase
 *
 * Run this script to populate your PocketBase instance with sample data.
 *
 * Usage:
 *   ts-node scripts/seed.ts
 *
 * Or using tsx:
 *   npx tsx scripts/seed.ts
 */

import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function seed() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Login as admin (you'll need to create an admin account first via the PocketBase UI)
    console.log('📝 Authenticating...');
    await pb.admins.authWithPassword('admin@demo.com', 'admin123');
    console.log('✅ Authenticated as admin\n');

    // 1. Create Users
    console.log('👥 Creating users...');
    const users = [];

    const adminUser = await createIfNotExists('users', 'admin@demo.com', {
      email: 'admin@demo.com',
      password: 'admin123',
      passwordConfirm: 'admin123',
      name: 'Admin User',
      role: 'admin',
    });
    users.push(adminUser);

    const consultant1 = await createIfNotExists('users', 'sarah@energy.com', {
      email: 'sarah@energy.com',
      password: 'password123',
      passwordConfirm: 'password123',
      name: 'Sarah Johnson',
      role: 'consultant',
    });
    users.push(consultant1);

    const consultant2 = await createIfNotExists('users', 'mike@energy.com', {
      email: 'mike@energy.com',
      password: 'password123',
      passwordConfirm: 'password123',
      name: 'Mike Chen',
      role: 'consultant',
    });
    users.push(consultant2);

    console.log(`✅ Created ${users.length} users\n`);

    // 2. Create Clients
    console.log('🏢 Creating clients...');
    const clients = [];

    const stateU = await createIfNotExists('clients', 'State University', {
      name: 'State University',
      contact_name: 'Dr. Robert Williams',
      contact_email: 'r.williams@stateu.edu',
      contact_phone: '555-0101',
      address: '123 University Ave',
      city: 'University City',
      state: 'CA',
      zip: '90210',
      status: 'active',
      contract_start_date: '2024-01-01',
      contract_end_date: '2025-12-31',
      contract_value: 250000,
    });
    clients.push(stateU);

    const techCollege = await createIfNotExists('clients', 'Tech College', {
      name: 'Tech College',
      contact_name: 'Jane Martinez',
      contact_email: 'j.martinez@techcollege.edu',
      contact_phone: '555-0202',
      address: '456 Tech Blvd',
      city: 'Innovation City',
      state: 'TX',
      zip: '75001',
      status: 'active',
      contract_start_date: '2023-06-01',
      contract_end_date: '2024-05-31',
      contract_value: 180000,
    });
    clients.push(techCollege);

    console.log(`✅ Created ${clients.length} clients\n`);

    // 3. Create Buildings
    console.log('🏛️ Creating buildings...');
    const buildings = [];

    const scienceHall = await createIfNotExists('buildings', 'Science Hall', {
      client: stateU.id,
      name: 'Science Hall',
      square_footage: 85000,
      building_type: 'laboratory',
      year_built: 1985,
      floors: 4,
      occupancy: 350,
    });
    buildings.push(scienceHall);

    const studentCenter = await createIfNotExists('buildings', 'Student Center', {
      client: stateU.id,
      name: 'Student Center',
      square_footage: 120000,
      building_type: 'dining',
      year_built: 2005,
      floors: 3,
      occupancy: 800,
    });
    buildings.push(studentCenter);

    const library = await createIfNotExists('buildings', 'Main Library', {
      client: stateU.id,
      name: 'Main Library',
      square_footage: 95000,
      building_type: 'library',
      year_built: 1978,
      floors: 5,
      occupancy: 500,
    });
    buildings.push(library);

    const dormA = await createIfNotExists('buildings', 'Dormitory A', {
      client: stateU.id,
      name: 'Dormitory A',
      square_footage: 75000,
      building_type: 'residential',
      year_built: 1995,
      floors: 6,
      occupancy: 300,
    });
    buildings.push(dormA);

    console.log(`✅ Created ${buildings.length} buildings\n`);

    // 4. Create Projects
    console.log('📋 Creating projects...');
    const projects = [];

    const hvacProject = await createIfNotExists('projects', 'HVAC Upgrade', {
      client: stateU.id,
      name: 'HVAC Upgrade - Science Hall',
      status: 'in_progress',
      start_date: '2024-03-01',
      end_date: '2024-12-31',
      budget: 450000,
      actual_cost: 280000,
      expected_annual_savings: 65000,
      roi_years: 6.9,
      buildings: [scienceHall.id],
      assigned_to: [consultant1.id],
    });
    projects.push(hvacProject);

    const ledProject = await createIfNotExists('projects', 'LED Retrofit', {
      client: stateU.id,
      name: 'LED Lighting Retrofit - Campus Wide',
      status: 'completed',
      start_date: '2023-09-01',
      end_date: '2024-02-28',
      budget: 180000,
      actual_cost: 165000,
      expected_annual_savings: 42000,
      actual_annual_savings: 45000,
      roi_years: 3.7,
      buildings: [scienceHall.id, studentCenter.id, library.id],
      assigned_to: [consultant2.id],
    });
    projects.push(ledProject);

    console.log(`✅ Created ${projects.length} projects\n`);

    // 5. Create Energy Data
    console.log('⚡ Creating energy data...');
    let energyDataCount = 0;

    // Generate monthly data for the past 12 months
    const today = new Date();
    for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
      const date = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 15);
      const timestamp = date.toISOString().split('T')[0];

      // Science Hall - Electricity
      await pb.collection('energy_data').create({
        building: scienceHall.id,
        timestamp,
        usage_kwh: 12500 - (monthsAgo * 150) + (Math.random() * 1000),
        cost: 1875 - (monthsAgo * 22) + (Math.random() * 150),
        fuel_type: 'electricity',
        meter_id: 'ELEC-SCI-001',
        reading_type: 'actual',
        demand_kw: 85 + (Math.random() * 10),
      });
      energyDataCount++;

      // Science Hall - Natural Gas
      await pb.collection('energy_data').create({
        building: scienceHall.id,
        timestamp,
        usage_kwh: 8500 - (monthsAgo * 200) + (Math.random() * 800),
        cost: 680 - (monthsAgo * 16) + (Math.random() * 60),
        fuel_type: 'natural_gas',
        meter_id: 'GAS-SCI-001',
        reading_type: 'actual',
      });
      energyDataCount++;

      // Student Center - Electricity
      await pb.collection('energy_data').create({
        building: studentCenter.id,
        timestamp,
        usage_kwh: 15200 - (monthsAgo * 100) + (Math.random() * 1200),
        cost: 2280 - (monthsAgo * 15) + (Math.random() * 180),
        fuel_type: 'electricity',
        meter_id: 'ELEC-SC-001',
        reading_type: 'actual',
        demand_kw: 95 + (Math.random() * 12),
      });
      energyDataCount++;

      // Library - Electricity
      await pb.collection('energy_data').create({
        building: library.id,
        timestamp,
        usage_kwh: 9800 - (monthsAgo * 80) + (Math.random() * 900),
        cost: 1470 - (monthsAgo * 12) + (Math.random() * 135),
        fuel_type: 'electricity',
        meter_id: 'ELEC-LIB-001',
        reading_type: 'actual',
        demand_kw: 68 + (Math.random() * 8),
      });
      energyDataCount++;

      // Dormitory A - Electricity
      await pb.collection('energy_data').create({
        building: dormA.id,
        timestamp,
        usage_kwh: 18500 - (monthsAgo * 120) + (Math.random() * 1500),
        cost: 2775 - (monthsAgo * 18) + (Math.random() * 225),
        fuel_type: 'electricity',
        meter_id: 'ELEC-DORM-001',
        reading_type: 'actual',
        demand_kw: 105 + (Math.random() * 15),
      });
      energyDataCount++;
    }

    console.log(`✅ Created ${energyDataCount} energy data records\n`);

    // 6. Create Audits
    console.log('🔍 Creating audits...');
    const audits = [];

    const audit1 = await createIfNotExists('audits', 'State U Q1 2024', {
      client: stateU.id,
      buildings: [scienceHall.id, studentCenter.id],
      audit_date: '2024-02-15',
      auditor: consultant1.id,
      audit_type: 'investment_grade',
      status: 'completed',
      findings_summary: 'Identified significant HVAC efficiency opportunities in Science Hall. Lighting upgrades recommended for Student Center.',
    });
    audits.push(audit1);

    console.log(`✅ Created ${audits.length} audits\n`);

    // 7. Create Recommendations
    console.log('💡 Creating recommendations...');
    const recommendations = [];

    const rec1 = await createIfNotExists('recommendations', 'HVAC VFD', {
      audit: audit1.id,
      building: scienceHall.id,
      title: 'Install Variable Frequency Drives on HVAC',
      category: 'hvac',
      estimated_cost: 85000,
      estimated_annual_savings: 18000,
      roi_years: 4.7,
      priority: 'high',
      status: 'implemented',
      project: hvacProject.id,
    });
    recommendations.push(rec1);

    const rec2 = await createIfNotExists('recommendations', 'LED Upgrade', {
      audit: audit1.id,
      building: studentCenter.id,
      title: 'Upgrade to LED Lighting',
      category: 'lighting',
      estimated_cost: 45000,
      estimated_annual_savings: 12000,
      roi_years: 3.75,
      priority: 'medium',
      status: 'implemented',
      project: ledProject.id,
    });
    recommendations.push(rec2);

    console.log(`✅ Created ${recommendations.length} recommendations\n`);

    // 8. Create Tasks
    console.log('✓ Creating tasks...');
    const tasks = [];

    const task1 = await createIfNotExists('tasks', 'HVAC Installation Review', {
      title: 'Review HVAC installation progress',
      project: hvacProject.id,
      assigned_to: consultant1.id,
      created_by: adminUser.id,
      due_date: '2024-11-15',
      status: 'in_progress',
      priority: 'high',
    });
    tasks.push(task1);

    const task2 = await createIfNotExists('tasks', 'Quarterly Report', {
      title: 'Prepare Q4 energy report',
      assigned_to: consultant2.id,
      created_by: adminUser.id,
      due_date: '2024-12-31',
      status: 'todo',
      priority: 'medium',
    });
    tasks.push(task2);

    console.log(`✅ Created ${tasks.length} tasks\n`);

    console.log('✅ Database seeding completed successfully!\n');
    console.log('Summary:');
    console.log(`  - ${users.length} users`);
    console.log(`  - ${clients.length} clients`);
    console.log(`  - ${buildings.length} buildings`);
    console.log(`  - ${projects.length} projects`);
    console.log(`  - ${energyDataCount} energy data records`);
    console.log(`  - ${audits.length} audits`);
    console.log(`  - ${recommendations.length} recommendations`);
    console.log(`  - ${tasks.length} tasks`);
    console.log('\n🎉 All done! You can now log in with:');
    console.log('   Email: admin@demo.com');
    console.log('   Password: admin123\n');

  } catch (error: any) {
    console.error('❌ Error seeding database:', error.message);
    if (error.data) {
      console.error('Details:', error.data);
    }
    process.exit(1);
  }
}

// Helper function to create record only if it doesn't exist
async function createIfNotExists(collection: string, uniqueField: string, data: any) {
  try {
    // Try to find existing record
    const results = await pb.collection(collection).getFullList({
      filter: `name = "${uniqueField}" || email = "${uniqueField}"`,
    });

    if (results.length > 0) {
      console.log(`  ⏭️  ${collection}: "${uniqueField}" already exists, skipping`);
      return results[0];
    }

    // Create new record
    const record = await pb.collection(collection).create(data);
    console.log(`  ✅ ${collection}: Created "${uniqueField}"`);
    return record;
  } catch (error: any) {
    console.error(`  ❌ ${collection}: Failed to create "${uniqueField}"`, error.message);
    throw error;
  }
}

// Run the seed function
seed();
