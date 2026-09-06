import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { hashPassword } from "../lib/password";
import { Role } from "../generated/prisma/client";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
};

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      ...userSelect,
      _count: { select: { reports: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function getUserWithStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const byStatus = await prisma.report.groupBy({
    by: ["status"],
    where: { userId },
    _count: true,
  });

  const stats = {
    DRAFT: 0,
    SUBMITTED: 0,
    NEEDS_CORRECTION: 0,
    APPROVED: 0,
  };

  for (const row of byStatus) {
    stats[row.status] = row._count;
  }

  return { user, stats };
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new AppError(409, "An account with this email already exists");
  }

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
    },
    select: userSelect,
  });
}

export async function updateUserRole(
  userId: string,
  role: Role,
  actingUserId: string
) {
  if (userId === actingUserId) {
    throw new AppError(409, "You cannot change your own role");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: userSelect,
  });
}

export async function deleteUser(userId: string, actingUserId: string) {
  if (userId === actingUserId) {
    throw new AppError(409, "You cannot remove your own account");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, _count: { select: { reports: true } } },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user._count.reports > 0) {
    throw new AppError(
      409,
      "This person still has reports, so their account cannot be removed without losing that history"
    );
  }

  await prisma.projectMember.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  return { id: userId };
}