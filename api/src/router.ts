import { router } from "./trpc.ts";
import { materialsRouter } from "./routers/materials.ts";
import { plantsRouter } from "./routers/plants.ts";

// One namespace per table keeps procedure names readable: materials.list, plants.list.
export const appRouter = router({
  materials: materialsRouter,
  plants: plantsRouter,
});

// The web app imports this type only, so it gets end-to-end types without any server code.
export type AppRouter = typeof appRouter;
