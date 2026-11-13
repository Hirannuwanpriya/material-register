import { initTRPC } from "@trpc/server";

// One tRPC instance for the whole API; routers and procedures are built from it.
const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;
