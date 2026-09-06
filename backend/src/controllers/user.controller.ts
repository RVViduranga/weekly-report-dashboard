import { Request, Response } from "express";
import {
  createUserSchema,
  updateUserRoleSchema,
} from "../validators/user.validator";
import {
  listUsers,
  getUserWithStats,
  createUser,
  updateUserRole,
  deleteUser,
} from "../services/user.service";
import { sendError, sendValidationError } from "../lib/http";

export async function list(_req: Request, res: Response): Promise<void> {
  try {
    const users = await listUsers();
    res.status(200).json({ users });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getOne(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  try {
    const result = await getUserWithStats(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  const parsed = createUserSchema.safeParse(req.body);

  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const user = await createUser(parsed.data);
    res.status(201).json({ user });
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateRole(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const parsed = updateUserRoleSchema.safeParse(req.body);

  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const user = await updateUserRole(
      req.params.id,
      parsed.data.role,
      req.user!.userId
    );
    res.status(200).json({ user });
  } catch (error) {
    sendError(res, error);
  }
}

export async function remove(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  try {
    const result = await deleteUser(req.params.id, req.user!.userId);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
}