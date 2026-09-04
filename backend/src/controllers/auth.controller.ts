import { loginSchema } from "../validators/auth.validator";
import { loginUser, getUserById } from "../services/auth.service";

import { Request, Response } from "express";
import { registerSchema } from "../validators/auth.validator";
import { registerUser } from "../services/auth.service";
import { AppError } from "../lib/errors";

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const user = await registerUser(parsed.data);
    res.status(201).json({ user });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

const isProduction = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const { token, user } = await loginUser(parsed.data);
    res.cookie("token", token, COOKIE_OPTIONS);
    res.status(200).json({ user });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(200).json({ message: "Logged out" });
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = await getUserById(req.user!.userId);
    res.status(200).json({ user });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}