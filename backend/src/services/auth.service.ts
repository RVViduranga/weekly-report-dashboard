import { comparePassword } from "../lib/password";
import { signToken } from "../lib/jwt";

import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { AppError } from "../lib/errors";
import { Role } from "../generated/prisma/client";

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role?: Role;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new AppError(409, "An account with this email already exists");
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role ?? "TEAM_MEMBER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = signToken({ userId: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
}