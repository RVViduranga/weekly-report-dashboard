import { Request, Response } from "express";
import { askAssistant } from "../services/assistant.service";
import { askAssistantSchema } from "../validators/assistant.validator";
import { sendError, sendValidationError } from "../lib/http";

export async function ask(req: Request, res: Response): Promise<void> {
  const parsed = askAssistantSchema.safeParse(req.body);

  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const data = await askAssistant(
      parsed.data.question,
      parsed.data.history ?? [],
      parsed.data.weekStart
    );
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
}
