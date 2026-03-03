import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../utils/errors.js';

export async function getStats(fastify: FastifyInstance) {
  const [users, foodItems, foodLogs, macroPlans, mealPlans] = await Promise.all([
    fastify.prisma.user.count(),
    fastify.prisma.foodItem.count(),
    fastify.prisma.foodLog.count(),
    fastify.prisma.macroPlan.count(),
    fastify.prisma.mealPlan.count(),
  ]);

  return { users, foodItems, foodLogs, macroPlans, mealPlans };
}

export async function listUsers(
  fastify: FastifyInstance,
  page: number,
  limit: number,
  search?: string,
) {
  const skip = (page - 1) * limit;
  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { displayName: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    fastify.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        authProvider: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: {
            foodLogs: true,
            macroPlans: true,
            mealPlans: true,
          },
        },
      },
    }),
    fastify.prisma.user.count({ where }),
  ]);

  return {
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function deleteUser(
  fastify: FastifyInstance,
  adminUserId: string,
  targetUserId: string,
) {
  if (adminUserId === targetUserId) {
    throw new ForbiddenError('Cannot delete your own account');
  }

  const user = await fastify.prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new NotFoundError('User');

  await fastify.prisma.user.delete({ where: { id: targetUserId } });
}

export async function listFoodItems(
  fastify: FastifyInstance,
  page: number,
  limit: number,
  search?: string,
) {
  const skip = (page - 1) * limit;
  const where = search
    ? { name: { contains: search, mode: 'insensitive' as const } }
    : {};

  const [items, total] = await Promise.all([
    fastify.prisma.foodItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    fastify.prisma.foodItem.count({ where }),
  ]);

  return {
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function resetUserPassword(
  fastify: FastifyInstance,
  adminUserId: string,
  targetUserId: string,
) {
  if (adminUserId === targetUserId) {
    throw new ForbiddenError('Cannot reset your own password this way');
  }

  const user = await fastify.prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new NotFoundError('User');

  if (user.authProvider !== 'LOCAL') {
    throw new ValidationError('Cannot reset password for OAuth users');
  }

  // Generate a 12-char random temporary password
  const tempPassword = crypto.randomBytes(9).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await fastify.prisma.user.update({
    where: { id: targetUserId },
    data: { passwordHash, mustChangePassword: true },
  });

  return { tempPassword };
}

export async function createUser(
  fastify: FastifyInstance,
  email: string,
  password: string,
  displayName?: string,
) {
  const existing = await fastify.prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await fastify.prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName ?? null,
      authProvider: 'LOCAL',
      isAdmin: false,
      mustChangePassword: true,
      profile: { create: {} },
      settings: { create: {} },
    },
    select: { id: true, email: true, displayName: true, isAdmin: true, createdAt: true },
  });

  return user;
}

export async function updateFoodItem(
  fastify: FastifyInstance,
  foodItemId: string,
  data: {
    name?: string;
    brand?: string;
    barcode?: string;
    servingSizeG?: number;
    caloriesPer100g?: number;
    proteinPer100g?: number;
    carbsPer100g?: number;
    fatPer100g?: number;
    fiberPer100g?: number | null;
    sugarPer100g?: number | null;
    sodiumPer100g?: number | null;
  },
) {
  const item = await fastify.prisma.foodItem.findUnique({ where: { id: foodItemId } });
  if (!item) throw new NotFoundError('Food item');

  return fastify.prisma.foodItem.update({
    where: { id: foodItemId },
    data,
  });
}

export async function deleteFoodItem(fastify: FastifyInstance, foodItemId: string) {
  const item = await fastify.prisma.foodItem.findUnique({ where: { id: foodItemId } });
  if (!item) throw new NotFoundError('Food item');

  // Delete associated food logs first
  await fastify.prisma.foodLog.deleteMany({ where: { foodItemId } });
  await fastify.prisma.foodItem.delete({ where: { id: foodItemId } });
}
