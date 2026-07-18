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
	index
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
