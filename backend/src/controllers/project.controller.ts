import { Request, Response } from "express";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../validators/project.validator";
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deactivateProject,
} from "../services/project.service";
import { sendError, sendValidationError } from "../lib/http";

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const includeInactive =
      req.query.includeInactive === "true" && req.user?.role === "MANAGER";
    const projects = await listProjects(includeInactive);
    res.status(200).json({ projects });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getOne(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  try {
    const project = await getProjectById(req.params.id);
    res.status(200).json({ project });
  } catch (error) {
    sendError(res, error);
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  const parsed = createProjectSchema.safeParse(req.body);

  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const project = await createProject(parsed.data);
    res.status(201).json({ project });
  } catch (error) {
    sendError(res, error);
  }
}

export async function update(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const parsed = updateProjectSchema.safeParse(req.body);

  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const project = await updateProject(req.params.id, parsed.data);
    res.status(200).json({ project });
  } catch (error) {
    sendError(res, error);
  }
}

export async function remove(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  try {
    const project = await deactivateProject(req.params.id);
    res.status(200).json({ project });
  } catch (error) {
    sendError(res, error);
  }
}