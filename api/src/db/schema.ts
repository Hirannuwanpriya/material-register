import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Exported so Zod inputs can reuse `.enumValues` and never drift from the database.
export const materialTypeEnum = pgEnum("material_type", [
  "Spare Part",
  "Consumable",
  "Raw Material",
  "Tool",
]);

export const materialStatusEnum = pgEnum("material_status", [
  "Active",
  "Obsolete",
  "Pending Review",
]);

export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  // SAP plant codes are 4 characters, e.g. 1000.
  code: varchar("code", { length: 4 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const manufacturers = pgTable("manufacturers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

export const materials = pgTable(
  "materials",
  {
    id: serial("id").primaryKey(),
    // The unique constraint also gives this column its index.
    materialNumber: varchar("material_number", { length: 20 }).notNull().unique(),
    description: text("description").notNull(),
    type: materialTypeEnum("type").notNull(),
    status: materialStatusEnum("status").notNull().default("Active"),
    manufacturerId: integer("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id),
    mpn: varchar("mpn", { length: 50 }).notNull(),
    plantId: integer("plant_id")
      .notNull()
      .references(() => plants.id),
    uom: varchar("uom", { length: 10 }).notNull(),
    // numeric, not float, so money never picks up rounding errors; read back as a string.
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    stockQty: integer("stock_qty").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Every filtered or sorted column gets an index; Postgres does not index foreign keys itself.
  (table) => [
    index("materials_type_idx").on(table.type),
    index("materials_status_idx").on(table.status),
    index("materials_plant_id_idx").on(table.plantId),
    index("materials_manufacturer_id_idx").on(table.manufacturerId),
    index("materials_updated_at_idx").on(table.updatedAt),
    index("materials_description_idx").on(table.description),
    index("materials_unit_price_idx").on(table.unitPrice),
    index("materials_stock_qty_idx").on(table.stockQty),
  ],
);
