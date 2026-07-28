CREATE TABLE "degree_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station" text NOT NULL,
	"period" date NOT NULL,
	"base_temp_f" numeric(5, 2) DEFAULT '65' NOT NULL,
	"hdd" numeric(10, 2) NOT NULL,
	"cdd" numeric(10, 2) NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "degree_days_station_period_base_idx" ON "degree_days" USING btree ("station","period","base_temp_f");--> statement-breakpoint
CREATE INDEX "degree_days_period_idx" ON "degree_days" USING btree ("period");