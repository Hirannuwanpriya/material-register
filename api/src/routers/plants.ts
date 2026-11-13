import { asc } from "drizzle-orm";
import { db } from "../db/index.ts";
import { plants } from "../db/schema.ts";
import { publicProcedure, router } from "../trpc.ts";

export const plantsRouter = router({
  // Only 8 rows, so no paging; ordered by code so the Plant filter options read 1000, 1100, ...
  list: publicProcedure.query(() =>
    db
      .select({ id: plants.id, code: plants.code, name: plants.name })
      .from(plants)
      .orderBy(asc(plants.code)),
  ),
});
