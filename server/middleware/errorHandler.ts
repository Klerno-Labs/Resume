import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import { captureError } from "../lib/sentry";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.errors,
    });
  }

  // Application errors
  if (err instanceof AppError) {
    if (err.isOperational) {
      console.warn(`Operational error: ${err.message}`, {
        statusCode: err.statusCode,
        path: req.path,
      });
    } else {
      console.error("Non-operational error:", err);
      captureError(err, {
        statusCode: err.statusCode,
        path: req.path,
        user: (req as any).user?.id,
      });
    }

    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Unexpected errors
  console.error("Unexpected error:", err);
  captureError(err, { path: req.path });

  return res.status(500).json({
    message: "An unexpected error occurred",
  });
}
