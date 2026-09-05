import { Request, Response } from "express";
import {
  createReportSchema,
  updateReportSchema,
  reviewReportSchema,
  listReportsQuerySchema,
} from "../validators/report.validator";
import {
  createReport,
  getReport,
  updateReport,
  submitReport,
  reviewReport,
  listReports,
  getReportVersions,
} from "../services/report.service";
import { sendError, sendValidationError } from "../lib/http";

export async function create(req: Request, res: Response): Promise<void> {
  const parsed = createReportSchema.safeParse(req.body);

  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const report = await createReport(req.user!.userId, parsed.data);
    res.status(201).json({ report });
  } catch (error) {
    sendError(res, error);
  }
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const parsed = listReportsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const result = await listReports(parsed.data, req.user!.userId);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function listAll(req: Request, res: Response): Promise<void> {
  const parsed = listReportsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const result = await listReports(parsed.data);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function getOne(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  try {
    const report = await getReport(req.params.id, req.user!);
    res.status(200).json({ report });
  } catch (error) {
    sendError(res, error);
  }
}

export async function update(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const parsed = updateReportSchema.safeParse(req.body);

  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const report = await updateReport(
      req.params.id,
      req.user!.userId,
      parsed.data
    );
    res.status(200).json({ report });
  } catch (error) {
    sendError(res, error);
  }
}

export async function submit(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  try {
    const report = await submitReport(req.params.id, req.user!.userId);
    res.status(200).json({ report });
  } catch (error) {
    sendError(res, error);
  }
}

export async function review(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const parsed = reviewReportSchema.safeParse(req.body);

  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const report = await reviewReport(
      req.params.id,
      req.user!.userId,
      parsed.data
    );
    res.status(200).json({ report });
  } catch (error) {
    sendError(res, error);
  }
}

export async function versions(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  try {
    const versionList = await getReportVersions(req.params.id, req.user!);
    res.status(200).json({ versions: versionList });
  } catch (error) {
    sendError(res, error);
  }
}