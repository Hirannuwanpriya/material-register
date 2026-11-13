import { initTRPC } from "@trpc/server";
import { ZodError } from "zod";

// One tRPC instance for the whole API; routers and procedures are built from it.
const t = initTRPC.create({
  // Shapes every error the client sees. onError in index.ts logs the full error on the server for 500s.
  errorFormatter({ shape, error }) {
    // tRPC's default message for a Zod failure is the raw JSON issue list; turn it into
    // "path: message" pairs so a person can read it and a UI can map it to a field.
    // Only for BAD_REQUEST: an output validation failure is a 500 with a ZodError cause too,
    // and its paths describe server internals, not the client's input.
    const issues =
      error.code === "BAD_REQUEST" && error.cause instanceof ZodError
        ? error.cause.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            message: issue.message,
          }))
        : null;

    let message = shape.message;
    if (issues) {
      message = issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message)).join("; ");
    }
    // A 500 message can hold SQL text or driver details, so the client only gets a generic one.
    if (error.code === "INTERNAL_SERVER_ERROR") {
      message = "Something went wrong. Please try again.";
    }

    // Rebuild data without `stack`: it exposes server file paths, even in development,
    // and the server log already has it.
    return {
      ...shape,
      message,
      data: {
        code: shape.data.code,
        httpStatus: shape.data.httpStatus,
        path: shape.data.path,
        issues,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
