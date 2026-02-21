import type { FastifyInstance } from 'fastify';
import type { CreateFoodLogInput, UpdateFoodLogInput } from '@macrotracker/shared';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export async function getLogByDate(fastify: FastifyInstance, userId: string, date: string) {
  return fastify.prisma.foodLog.findMany({
    where: { userId, logDate: new Date(date) },
    include: { foodItem: true },
    orderBy: [{ mealType: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getDailySummary(fastify: FastifyInstance, userId: string, date: string) {
  const logs = await fastify.prisma.foodLog.findMany({
    where: { userId, logDate: new Date(date) },
  });

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.totalCalories,
      proteinG: acc.proteinG + log.totalProteinG,
      carbsG: acc.carbsG + log.totalCarbsG,
      fatG: acc.fatG + log.totalFatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  const profile = await fastify.prisma.userProfile.findUnique({ where: { userId } });

  return {
    date,
    totals: {
      calories: Math.round(totals.calories),
      proteinG: Math.round(totals.proteinG),
      carbsG: Math.round(totals.carbsG),
      fatG: Math.round(totals.fatG),
    },
    targets: {
      calories: profile?.targetCalories ?? 2000,
      proteinG: profile?.targetProteinG ?? 150,
      carbsG: profile?.targetCarbsG ?? 250,
      fatG: profile?.targetFatG ?? 65,
    },
    entries: logs.length,
  };
}

export async function getLogRange(
  fastify: FastifyInstance,
  userId: string,
  from: string,
  to: string,
) {
  const logs = await fastify.prisma.foodLog.findMany({
    where: {
      userId,
      logDate: { gte: new Date(from), lte: new Date(to) },
    },
    orderBy: { logDate: 'asc' },
  });

  const byDate = new Map<string, typeof logs>();
  for (const log of logs) {
    const dateKey = log.logDate.toISOString().split('T')[0];
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(log);
  }

  return Array.from(byDate.entries()).map(([date, dayLogs]) => ({
    date,
    totals: {
      calories: Math.round(dayLogs.reduce((s, l) => s + l.totalCalories, 0)),
      proteinG: Math.round(dayLogs.reduce((s, l) => s + l.totalProteinG, 0)),
      carbsG: Math.round(dayLogs.reduce((s, l) => s + l.totalCarbsG, 0)),
      fatG: Math.round(dayLogs.reduce((s, l) => s + l.totalFatG, 0)),
    },
    entries: dayLogs.length,
  }));
}

export async function createLogEntry(
  fastify: FastifyInstance,
  userId: string,
  input: CreateFoodLogInput,
) {
  const foodItem = await fastify.prisma.foodItem.findUnique({
    where: { id: input.foodItemId },
  });
  if (!foodItem) throw new NotFoundError('Food item');

  const factor = (input.servingSizeG * input.servingQty) / 100;

  return fastify.prisma.foodLog.create({
    data: {
      userId,
      foodItemId: input.foodItemId,
      logDate: new Date(input.logDate),
      mealType: input.mealType,
      servingQty: input.servingQty,
      servingSizeG: input.servingSizeG,
      totalCalories: foodItem.caloriesPer100g * factor,
      totalProteinG: foodItem.proteinPer100g * factor,
      totalCarbsG: foodItem.carbsPer100g * factor,
      totalFatG: foodItem.fatPer100g * factor,
      notes: input.notes ?? null,
    },
    include: { foodItem: true },
  });
}

export async function updateLogEntry(
  fastify: FastifyInstance,
  userId: string,
  logId: string,
  input: UpdateFoodLogInput,
) {
  const existing = await fastify.prisma.foodLog.findUnique({
    where: { id: logId },
    include: { foodItem: true },
  });
  if (!existing) throw new NotFoundError('Food log entry');
  if (existing.userId !== userId) throw new ForbiddenError();

  const servingQty = input.servingQty ?? existing.servingQty;
  const servingSizeG = input.servingSizeG ?? existing.servingSizeG;
  const factor = (servingSizeG * servingQty) / 100;

  return fastify.prisma.foodLog.update({
    where: { id: logId },
    data: {
      mealType: input.mealType ?? existing.mealType,
      servingQty,
      servingSizeG,
      totalCalories: existing.foodItem.caloriesPer100g * factor,
      totalProteinG: existing.foodItem.proteinPer100g * factor,
      totalCarbsG: existing.foodItem.carbsPer100g * factor,
      totalFatG: existing.foodItem.fatPer100g * factor,
      notes: input.notes !== undefined ? input.notes : existing.notes,
    },
    include: { foodItem: true },
  });
}

export async function deleteLogEntry(fastify: FastifyInstance, userId: string, logId: string) {
  const existing = await fastify.prisma.foodLog.findUnique({ where: { id: logId } });
  if (!existing) throw new NotFoundError('Food log entry');
  if (existing.userId !== userId) throw new ForbiddenError();

  await fastify.prisma.foodLog.delete({ where: { id: logId } });
}
