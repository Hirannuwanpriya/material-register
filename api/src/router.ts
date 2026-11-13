import { router } from "./trpc.ts";
import { materialsRouter } from "./routers/materials.ts";

// plants.list (for the Plant filter options) is still to come.
export const appRouter = router({
  materials: materialsRouter,
});

// The web app imports this type only, so it gets end-to-end types without any server code.
export type AppRouter = typeof appRouter;
