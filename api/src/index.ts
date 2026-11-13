import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router.ts";

const port = Number(process.env.PORT ?? 3001);
const webOrigin = process.env.WEB_ORIGIN;

// Fail at startup rather than on the first request, with a message that says how to fix it.
for (const name of ["DATABASE_URL", "WEB_ORIGIN"]) {
  if (!process.env[name]) {
    console.error(`${name} is not set. Copy api/.env.sample to api/.env.`);
    process.exit(1);
  }
}

const app = express();

// An array makes cors compare the request Origin and echo it only on a match;
// a plain string is sent back to every origin, so nothing would be blocked.
// The `false` branch never runs (startup exits without WEB_ORIGIN); it only narrows the type.
app.use(cors({ origin: webOrigin ? [webOrigin] : false }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    // Bad input already becomes a 400 for the client; log only real server failures.
    onError({ path, error }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`tRPC error on ${path ?? "<no path>"}:`, error);
      }
    },
  }),
);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
