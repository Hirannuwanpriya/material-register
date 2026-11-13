import { and, asc, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.ts";
import {
  manufacturers,
  materialStatusEnum,
  materials,
  materialTypeEnum,
  plants,
} from "../db/schema.ts";
import { publicProcedure, router } from "../trpc.ts";

// Caps each filter list so one request cannot send an unbounded IN (...) list.
const MAX_FILTER_VALUES = 50;

// The only columns a client may sort by; user text never reaches ORDER BY.
const sortColumns = {
  materialNumber: materials.materialNumber,
  description: materials.description,
  unitPrice: materials.unitPrice,
  stockQty: materials.stockQty,
  updatedAt: materials.updatedAt,
} as const;

type SortKey = keyof typeof sortColumns;
const sortKeys = Object.keys(sortColumns) as [SortKey, ...SortKey[]];

const listInput = z
  .object({
    search: z.string().trim().max(100).default(""),
    types: z.array(z.enum(materialTypeEnum.enumValues)).max(MAX_FILTER_VALUES).default([]),
    statuses: z.array(z.enum(materialStatusEnum.enumValues)).max(MAX_FILTER_VALUES).default([]),
    plantIds: z.array(z.number().int().positive()).max(MAX_FILTER_VALUES).default([]),
    sortBy: z.enum(sortKeys).default("materialNumber"),
    sortDir: z.enum(["asc", "desc"]).default("asc"),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(10).max(100).default(25),
  })
  // prefault, not default: in Zod v4 only prefault runs the inner field defaults on missing input.
  .prefault({});

// Backslash is Postgres's default LIKE escape, so this makes %, _ and \ match literally.
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

export const materialsRouter = router({
  list: publicProcedure.input(listInput).query(async ({ input }) => {
    const { search, types, statuses, plantIds, sortBy, sortDir, page, pageSize } = input;

    const pattern = `%${escapeLike(search)}%`;

    // and() ignores undefined, so an empty search or filter simply adds no condition.
    const where: SQL | undefined = and(
      search
        ? or(
            ilike(materials.materialNumber, pattern),
            ilike(materials.description, pattern),
            ilike(materials.mpn, pattern),
          )
        : undefined,
      types.length > 0 ? inArray(materials.type, types) : undefined,
      statuses.length > 0 ? inArray(materials.status, statuses) : undefined,
      plantIds.length > 0 ? inArray(materials.plantId, plantIds) : undefined,
    );

    const sortColumn = sortColumns[sortBy];

    const [rows, total] = await Promise.all([
      db
        .select({
          id: materials.id,
          materialNumber: materials.materialNumber,
          description: materials.description,
          type: materials.type,
          status: materials.status,
          mpn: materials.mpn,
          uom: materials.uom,
          unitPrice: materials.unitPrice,
          stockQty: materials.stockQty,
          updatedAt: materials.updatedAt,
          plant: { id: plants.id, code: plants.code, name: plants.name },
          manufacturer: { id: manufacturers.id, name: manufacturers.name },
        })
        .from(materials)
        // Inner joins are safe: both foreign keys are NOT NULL.
        .innerJoin(plants, eq(materials.plantId, plants.id))
        .innerJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
        .where(where)
        // id breaks ties (e.g. equal prices) so rows never repeat or vanish between pages.
        .orderBy(sortDir === "asc" ? asc(sortColumn) : desc(sortColumn), asc(materials.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.$count(materials, where),
    ]);

    return {
      // JSON has no Date type, so send an ISO string the browser can parse.
      items: rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })),
      total,
      page,
      pageSize,
      // At least 1 so "page 1 of 1" is always a valid page, even when nothing matches.
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  }),
});
