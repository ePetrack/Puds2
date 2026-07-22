CREATE TYPE "public"."account_status" AS ENUM('active', 'pending', 'closed');--> statement-breakpoint
CREATE TYPE "public"."bill_status" AS ENUM('pending', 'approved', 'paid', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."meter_status" AS ENUM('active', 'inactive', 'retired');--> statement-breakpoint
CREATE TYPE "public"."meter_unit" AS ENUM('kwh', 'therms', 'ccf', 'mcf', 'gallons', 'kgal', 'cubic_meters', 'mlb', 'ton_hours', 'other');--> statement-breakpoint
CREATE TYPE "public"."rate_type" AS ENUM('flat', 'tiered', 'time_of_use', 'demand', 'custom');--> statement-breakpoint
CREATE TYPE "public"."reading_type" AS ENUM('actual', 'estimated');--> statement-breakpoint
CREATE TYPE "public"."utility_type" AS ENUM('electricity', 'natural_gas', 'water', 'sewer', 'steam', 'chilled_water', 'fuel_oil', 'propane', 'other');--> statement-breakpoint
CREATE TABLE "meters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"account_id" uuid,
	"meter_number" text NOT NULL,
	"utility_type" "utility_type" NOT NULL,
	"unit" "meter_unit" NOT NULL,
	"status" "meter_status" DEFAULT 'active' NOT NULL,
	"is_submeter" boolean DEFAULT false NOT NULL,
	"multiplier" numeric(10, 4),
	"install_date" date,
	"location" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"name" text NOT NULL,
	"utility_type" "utility_type" NOT NULL,
	"rate_type" "rate_type" NOT NULL,
	"energy_rate" numeric(12, 6),
	"demand_rate" numeric(12, 4),
	"fixed_monthly_charge" numeric(12, 2),
	"unit" text,
	"effective_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utility_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"account_number" text NOT NULL,
	"utility_type" "utility_type" NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"rate_schedule_id" uuid,
	"service_address" text,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utility_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"meter_id" uuid,
	"statement_date" date NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"due_date" date,
	"usage" numeric(14, 3),
	"unit" text,
	"demand_kw" numeric(12, 3),
	"energy_charge" numeric(12, 2),
	"demand_charge" numeric(12, 2),
	"fixed_charge" numeric(12, 2),
	"taxes_fees" numeric(12, 2),
	"other_charges" numeric(12, 2),
	"total_cost" numeric(12, 2) NOT NULL,
	"status" "bill_status" DEFAULT 'pending' NOT NULL,
	"payment_date" date,
	"reading_type" "reading_type",
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utility_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"utility_types" "utility_type"[] DEFAULT '{}' NOT NULL,
	"account_manager" text,
	"phone" text,
	"email" text,
	"website" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_account_id_utility_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."utility_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_schedules" ADD CONSTRAINT "rate_schedules_provider_id_utility_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."utility_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_accounts" ADD CONSTRAINT "utility_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_accounts" ADD CONSTRAINT "utility_accounts_provider_id_utility_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."utility_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_accounts" ADD CONSTRAINT "utility_accounts_rate_schedule_id_rate_schedules_id_fk" FOREIGN KEY ("rate_schedule_id") REFERENCES "public"."rate_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_account_id_utility_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."utility_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meters_building_id_idx" ON "meters" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "rate_schedules_provider_id_idx" ON "rate_schedules" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "utility_accounts_client_id_idx" ON "utility_accounts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "utility_accounts_account_number_idx" ON "utility_accounts" USING btree ("account_number");--> statement-breakpoint
CREATE INDEX "utility_bills_account_id_idx" ON "utility_bills" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "utility_bills_period_end_idx" ON "utility_bills" USING btree ("period_end");