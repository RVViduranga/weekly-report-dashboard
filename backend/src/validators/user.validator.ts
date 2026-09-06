import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Must be a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["TEAM_MEMBER", "MANAGER"]),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["TEAM_MEMBER", "MANAGER"]),
});