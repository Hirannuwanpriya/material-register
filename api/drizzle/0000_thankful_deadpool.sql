CREATE TYPE "public"."material_status" AS ENUM('Active', 'Obsolete', 'Pending Review');--> statement-breakpoint
CREATE TYPE "public"."material_type" AS ENUM('Spare Part', 'Consumable', 'Raw Material', 'Tool');--> statement-breakpoint
CREATE TABLE "manufacturers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "manufacturers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_number" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"type" "material_type" NOT NULL,
	"status" "material_status" DEFAULT 'Active' NOT NULL,
	"manufacturer_id" integer NOT NULL,
	"mpn" varchar(50) NOT NULL,
	"plant_id" integer NOT NULL,
	"uom" varchar(10) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materials_material_number_unique" UNIQUE("material_number")
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(4) NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "plants_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "materials_type_idx" ON "materials" USING btree ("type");--> statement-breakpoint
CREATE INDEX "materials_status_idx" ON "materials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "materials_plant_id_idx" ON "materials" USING btree ("plant_id");--> statement-breakpoint
CREATE INDEX "materials_manufacturer_id_idx" ON "materials" USING btree ("manufacturer_id");--> statement-breakpoint
CREATE INDEX "materials_updated_at_idx" ON "materials" USING btree ("updated_at");