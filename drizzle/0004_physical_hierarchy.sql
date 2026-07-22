CREATE TABLE "campuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complexes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"campus_id" uuid,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meters" ALTER COLUMN "building_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "campus_id" uuid;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "complex_id" uuid;--> statement-breakpoint
ALTER TABLE "meters" ADD COLUMN "complex_id" uuid;--> statement-breakpoint
ALTER TABLE "meters" ADD COLUMN "parent_meter_id" uuid;--> statement-breakpoint
ALTER TABLE "campuses" ADD CONSTRAINT "campuses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complexes" ADD CONSTRAINT "complexes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complexes" ADD CONSTRAINT "complexes_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campuses_client_id_idx" ON "campuses" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "campuses_name_idx" ON "campuses" USING btree ("name");--> statement-breakpoint
CREATE INDEX "complexes_client_id_idx" ON "complexes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "complexes_campus_id_idx" ON "complexes" USING btree ("campus_id");--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_complex_id_complexes_id_fk" FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_complex_id_complexes_id_fk" FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_parent_meter_id_meters_id_fk" FOREIGN KEY ("parent_meter_id") REFERENCES "public"."meters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buildings_campus_id_idx" ON "buildings" USING btree ("campus_id");--> statement-breakpoint
CREATE INDEX "buildings_complex_id_idx" ON "buildings" USING btree ("complex_id");--> statement-breakpoint
CREATE INDEX "meters_complex_id_idx" ON "meters" USING btree ("complex_id");--> statement-breakpoint
CREATE INDEX "meters_parent_meter_id_idx" ON "meters" USING btree ("parent_meter_id");--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_premise_chk" CHECK (("meters"."building_id" is not null)::int + ("meters"."complex_id" is not null)::int = 1);