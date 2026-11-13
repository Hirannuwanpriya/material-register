import { router } from "./trpc.ts";

// Procedures (materials.list, plants.list) are added in Phase 2.
export const appRouter = router({});

// The web app imports this type only, so it gets end-to-end types without any server code.
export type AppRouter = typeof appRouter;
