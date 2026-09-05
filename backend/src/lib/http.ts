import { Response } from "express";
import { ZodError } from "zod";
import { AppError } from "./errors";

export function sendValidationError(res: Response, error: ZodError): void {
  res.status(400).json({
    message: "Validation failed",
    errors: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

export function sendError(res: Response, error: unknown): void {
  if (error instanceof AppError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ message: "Something went wrong" });
}