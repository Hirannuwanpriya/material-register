import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCContext } from "@trpc/tanstack-react-query";

// The only import from api/. Type-only, so no server code reaches the browser bundle.
import type { AppRouter } from "../../../api/src/router";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

// Batching lets queries fired in the same tick (materials + plants) share one HTTP request.
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL ?? "http://localhost:3001/trpc",
    }),
  ],
});

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
