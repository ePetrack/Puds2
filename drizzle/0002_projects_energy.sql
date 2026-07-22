CREATE TYPE "public"."project_status" AS ENUM('planning', 'approved', 'in_progress', 'completed', 'on_hold', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reading_source" AS ENUM('manual', 'csv_import');--> statement-breakpoint
CREATE TABLE "energy_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meter_id" uuid NOT NULL,
	"reading_date" date NOT NULL,
	"usage" numeric(14, 3) NOT NULL,
	"demand_kw" numeric(12, 3),
	"cost" numeric(12, 2),
	"reading_type" "reading_type" DEFAULT 'actual' NOT NULL,
	"source" "reading_source" DEFAULT 'manual' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_buildings" (
	"project_id" uuid NOT NULL,
	"building_id" uuid NOT NULL,
	CONSTRAINT "project_buildings_project_id_building_id_pk" PRIMARY KEY("project_id","building_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'planning' NOT NULL,
	"start_date" date,
	"end_date" date,
	"budget" numeric(14, 2),
	"actual_cost" numeric(14, 2),
	"expected_annual_savings" numeric(14, 2),
	"actual_annual_savings" numeric(14, 2),
	"roi_years" numeric(8, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "energy_readings" ADD CONSTRAINT "energy_readings_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_buildings" ADD CONSTRAINT "project_buildings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_buildings" ADD CONSTRAINT "project_buildings_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "energy_readings_meter_date_idx" ON "energy_readings" USING btree ("meter_id","reading_date");--> statement-breakpoint
CREATE INDEX "energy_readings_reading_date_idx" ON "energy_readings" USING btree ("reading_date");--> statement-breakpoint
CREATE INDEX "projects_client_id_idx" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");