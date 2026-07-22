import {
	pgTable,
	pgEnum,
	text,
	boolean,
	timestamp,
	uuid,
	integer,
	numeric,
	date,
	jsonb,
	index,
	uniqueIndex,
	primaryKey
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Auth tables (shape required by better-auth's drizzle adapter)
// ---------------------------------------------------------------------------

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	role: text('role').notNull().default('client'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [index('session_user_id_idx').on(t.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [index('account_user_id_idx').on(t.userId)]
);

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// ---------------------------------------------------------------------------
// Domain tables
// ---------------------------------------------------------------------------

export const clientStatus = pgEnum('client_status', ['active', 'inactive', 'prospective']);

export const buildingType = pgEnum('building_type', [
	'academic',
	'administrative',
	'residential',
	'laboratory',
	'athletic',
	'library',
	'healthcare',
	'dining',
	'other'
]);

export const clients = pgTable(
	'clients',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: text('name').notNull(),
		contactName: text('contact_name'),
		contactEmail: text('contact_email'),
		contactPhone: text('contact_phone'),
		address: text('address'),
		city: text('city'),
		state: text('state'),
		zip: text('zip'),
		contractStartDate: date('contract_start_date'),
		contractEndDate: date('contract_end_date'),
		contractValue: numeric('contract_value', { precision: 14, scale: 2 }),
		status: clientStatus('status').notNull().default('active'),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('clients_name_idx').on(t.name), index('clients_status_idx').on(t.status)]
);

export const buildings = pgTable(
	'buildings',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		buildingType: buildingType('building_type'),
		squareFootage: integer('square_footage'),
		yearBuilt: integer('year_built'),
		floors: integer('floors'),
		occupancy: integer('occupancy'),
		address: text('address'),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('buildings_client_id_idx').on(t.clientId), index('buildings_name_idx').on(t.name)]
);

// ---------------------------------------------------------------------------
// Utility management
// ---------------------------------------------------------------------------

export const utilityType = pgEnum('utility_type', [
	'electricity',
	'natural_gas',
	'water',
	'sewer',
	'steam',
	'chilled_water',
	'fuel_oil',
	'propane',
	'other'
]);

export const rateType = pgEnum('rate_type', ['flat', 'tiered', 'time_of_use', 'demand', 'custom']);
export const accountStatus = pgEnum('account_status', ['active', 'pending', 'closed']);
export const meterStatus = pgEnum('meter_status', ['active', 'inactive', 'retired']);
export const meterUnit = pgEnum('meter_unit', [
	'kwh',
	'therms',
	'ccf',
	'mcf',
	'gallons',
	'kgal',
	'cubic_meters',
	'mlb',
	'ton_hours',
	'other'
]);
export const billStatus = pgEnum('bill_status', ['pending', 'approved', 'paid', 'disputed']);
export const readingType = pgEnum('reading_type', ['actual', 'estimated']);

export const utilityProviders = pgTable('utility_providers', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	utilityTypes: utilityType('utility_types').array().notNull().default([]),
	accountManager: text('account_manager'),
	phone: text('phone'),
	email: text('email'),
	website: text('website'),
	address: text('address'),
	notes: text('notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const rateSchedules = pgTable(
	'rate_schedules',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		providerId: uuid('provider_id')
			.notNull()
			.references(() => utilityProviders.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		utilityType: utilityType('utility_type').notNull(),
		rateType: rateType('rate_type').notNull(),
		energyRate: numeric('energy_rate', { precision: 12, scale: 6 }),
		demandRate: numeric('demand_rate', { precision: 12, scale: 4 }),
		fixedMonthlyCharge: numeric('fixed_monthly_charge', { precision: 12, scale: 2 }),
		unit: text('unit'),
		effectiveDate: date('effective_date'),
		endDate: date('end_date'),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('rate_schedules_provider_id_idx').on(t.providerId)]
);

export const utilityAccounts = pgTable(
	'utility_accounts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id, { onDelete: 'cascade' }),
		providerId: uuid('provider_id')
			.notNull()
			.references(() => utilityProviders.id, { onDelete: 'restrict' }),
		accountNumber: text('account_number').notNull(),
		utilityType: utilityType('utility_type').notNull(),
		status: accountStatus('status').notNull().default('active'),
		rateScheduleId: uuid('rate_schedule_id').references(() => rateSchedules.id, {
			onDelete: 'set null'
		}),
		serviceAddress: text('service_address'),
		startDate: date('start_date'),
		endDate: date('end_date'),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('utility_accounts_client_id_idx').on(t.clientId),
		index('utility_accounts_account_number_idx').on(t.accountNumber)
	]
);

export const meters = pgTable(
	'meters',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		buildingId: uuid('building_id')
			.notNull()
			.references(() => buildings.id, { onDelete: 'cascade' }),
		accountId: uuid('account_id').references(() => utilityAccounts.id, { onDelete: 'set null' }),
		meterNumber: text('meter_number').notNull(),
		utilityType: utilityType('utility_type').notNull(),
		unit: meterUnit('unit').notNull(),
		status: meterStatus('status').notNull().default('active'),
		isSubmeter: boolean('is_submeter').notNull().default(false),
		multiplier: numeric('multiplier', { precision: 10, scale: 4 }),
		installDate: date('install_date'),
		location: text('location'),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('meters_building_id_idx').on(t.buildingId)]
);

export const utilityBills = pgTable(
	'utility_bills',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		accountId: uuid('account_id')
			.notNull()
			.references(() => utilityAccounts.id, { onDelete: 'cascade' }),
		meterId: uuid('meter_id').references(() => meters.id, { onDelete: 'set null' }),
		statementDate: date('statement_date').notNull(),
		periodStart: date('period_start').notNull(),
		periodEnd: date('period_end').notNull(),
		dueDate: date('due_date'),
		usage: numeric('usage', { precision: 14, scale: 3 }),
		unit: text('unit'),
		demandKw: numeric('demand_kw', { precision: 12, scale: 3 }),
		energyCharge: numeric('energy_charge', { precision: 12, scale: 2 }),
		demandCharge: numeric('demand_charge', { precision: 12, scale: 2 }),
		fixedCharge: numeric('fixed_charge', { precision: 12, scale: 2 }),
		taxesFees: numeric('taxes_fees', { precision: 12, scale: 2 }),
		otherCharges: numeric('other_charges', { precision: 12, scale: 2 }),
		totalCost: numeric('total_cost', { precision: 12, scale: 2 }).notNull(),
		status: billStatus('status').notNull().default('pending'),
		paymentDate: date('payment_date'),
		readingType: readingType('reading_type'),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('utility_bills_account_id_idx').on(t.accountId),
		index('utility_bills_period_end_idx').on(t.periodEnd)
	]
);

export type UtilityProvider = typeof utilityProviders.$inferSelect;
export type RateSchedule = typeof rateSchedules.$inferSelect;
export type UtilityAccount = typeof utilityAccounts.$inferSelect;
export type Meter = typeof meters.$inferSelect;
export type UtilityBill = typeof utilityBills.$inferSelect;
export type NewUtilityBill = typeof utilityBills.$inferInsert;

// ---------------------------------------------------------------------------
// Projects & energy data
// ---------------------------------------------------------------------------

export const projectStatus = pgEnum('project_status', [
	'planning',
	'approved',
	'in_progress',
	'completed',
	'on_hold',
	'cancelled'
]);

export const projects = pgTable(
	'projects',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		status: projectStatus('status').notNull().default('planning'),
		startDate: date('start_date'),
		endDate: date('end_date'),
		budget: numeric('budget', { precision: 14, scale: 2 }),
		actualCost: numeric('actual_cost', { precision: 14, scale: 2 }),
		expectedAnnualSavings: numeric('expected_annual_savings', { precision: 14, scale: 2 }),
		actualAnnualSavings: numeric('actual_annual_savings', { precision: 14, scale: 2 }),
		roiYears: numeric('roi_years', { precision: 8, scale: 2 }),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('projects_client_id_idx').on(t.clientId), index('projects_status_idx').on(t.status)]
);

export const projectBuildings = pgTable(
	'project_buildings',
	{
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		buildingId: uuid('building_id')
			.notNull()
			.references(() => buildings.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.projectId, t.buildingId] })]
);

export const readingSource = pgEnum('reading_source', ['manual', 'csv_import']);

export const energyReadings = pgTable(
	'energy_readings',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		meterId: uuid('meter_id')
			.notNull()
			.references(() => meters.id, { onDelete: 'cascade' }),
		readingDate: date('reading_date').notNull(),
		usage: numeric('usage', { precision: 14, scale: 3 }).notNull(),
		demandKw: numeric('demand_kw', { precision: 12, scale: 3 }),
		cost: numeric('cost', { precision: 12, scale: 2 }),
		readingType: readingType('reading_type').notNull().default('actual'),
		source: readingSource('source').notNull().default('manual'),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('energy_readings_meter_date_idx').on(t.meterId, t.readingDate),
		index('energy_readings_reading_date_idx').on(t.readingDate)
	]
);

export type Project = typeof projects.$inferSelect;
export type EnergyReading = typeof energyReadings.$inferSelect;

// ---------------------------------------------------------------------------
// Documents & tasks
// ---------------------------------------------------------------------------

export const documents = pgTable(
	'documents',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		title: text('title').notNull(),
		description: text('description'),
		fileName: text('file_name').notNull(),
		storedName: text('stored_name').notNull().unique(),
		mimeType: text('mime_type').notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
		projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
		buildingId: uuid('building_id').references(() => buildings.id, { onDelete: 'set null' }),
		uploadedBy: text('uploaded_by').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('documents_client_id_idx').on(t.clientId), index('documents_title_idx').on(t.title)]
);

export const taskStatus = pgEnum('task_status', ['todo', 'in_progress', 'completed', 'cancelled']);
export const taskPriority = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);

export const tasks = pgTable(
	'tasks',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		title: text('title').notNull(),
		description: text('description'),
		status: taskStatus('status').notNull().default('todo'),
		priority: taskPriority('priority').notNull().default('medium'),
		dueDate: date('due_date'),
		assignedTo: text('assigned_to').references(() => user.id, { onDelete: 'set null' }),
		projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
		clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('tasks_status_idx').on(t.status),
		index('tasks_assigned_to_idx').on(t.assignedTo),
		index('tasks_due_date_idx').on(t.dueDate)
	]
);

export type Document = typeof documents.$inferSelect;
export type Task = typeof tasks.$inferSelect;

export const auditAction = pgEnum('audit_action', ['create', 'update', 'delete']);

export const auditLog = pgTable(
	'audit_log',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
		entity: text('entity').notNull(),
		entityId: text('entity_id').notNull(),
		action: auditAction('action').notNull(),
		changes: jsonb('changes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('audit_log_entity_idx').on(t.entity, t.entityId),
		index('audit_log_created_at_idx').on(t.createdAt)
	]
);

export type User = typeof user.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Building = typeof buildings.$inferSelect;
export type NewBuilding = typeof buildings.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
