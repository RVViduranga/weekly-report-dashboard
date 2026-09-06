import { Request, Response } from "express";
import { z } from "zod";
import { getDashboard } from "../services/dashboard.service";
import { sendError, sendValidationError } from "../lib/http";

const dashboardQuerySchema = z.object({
  weekStart: z.coerce.date().optional(),
});

export async function get(req: Request, res: Response): Promise<void> {
  const parsed = dashboardQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const data = await getDashboard(parsed.data.weekStart);
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
}