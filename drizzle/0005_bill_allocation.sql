CREATE TYPE "public"."allocation_method" AS ENUM('submetered', 'area', 'occupancy', 'equal', 'fixed_percentage', 'hybrid');--> statement-breakpoint
CREATE TABLE "bill_allocation_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"allocation_id" uuid NOT NULL,
	"building_id" uuid,
	"label" text NOT NULL,
	"basis_value" numeric(16, 4),
	"share_pct" numeric(9, 6) NOT NULL,
	"usage" numeric(14, 3),
	"demand_kw" numeric(12, 3),
	"energy_cost" numeric(12, 2),
	"demand_cost" numeric(12, 2),
	"fixed_cost" numeric(12, 2),
	"total_cost" numeric(12, 2) NOT NULL,
	"is_remainder" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"method" "allocation_method" NOT NULL,
	"basis" jsonb,
	"warnings" jsonb,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bill_allocation_lines" ADD CONSTRAINT "bill_allocation_lines_allocation_id_bill_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."bill_allocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_allocation_lines" ADD CONSTRAINT "bill_allocation_lines_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_allocations" ADD CONSTRAINT "bill_allocations_bill_id_utility_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."utility_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_allocations" ADD CONSTRAINT "bill_allocations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bill_allocation_lines_allocation_id_idx" ON "bill_allocation_lines" USING btree ("allocation_id");--> statement-breakpoint
CREATE INDEX "bill_allocations_bill_id_idx" ON "bill_allocations" USING btree ("bill_id");