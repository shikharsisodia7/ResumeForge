import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/errors";

type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>;

/**
 * Wraps a route handler with centralized error handling so individual routes
 * never need to repeat try/catch or worry about leaking internals in error
 * responses. Only sanitized messages ever reach the client; full errors are
 * logged server-side.
 */
export function apiRoute(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      const response = await handler(req, ctx);
      // Private-by-default: individual routes (e.g. the public gallery) can
      // still opt into their own Cache-Control by setting it before return.
      if (!response.headers.has("Cache-Control")) {
        response.headers.set("Cache-Control", "private, no-store");
      }
      return response;
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status },
        );
      }
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: "Invalid request data",
            code: "validation_error",
            issues: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
          { status: 400 },
        );
      }
      console.error("[api] unhandled error", {
        path: req.nextUrl.pathname,
        method: req.method,
        message: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Something went wrong. Please try again.", code: "internal_error" },
        { status: 500 },
      );
    }
  };
}
