import type { FastifyInstance } from 'fastify';
import type { CreateFoodItemInput } from '@macrotracker/shared';
import { lookupBarcode } from './openfoodfacts.service.js';
import { NotFoundError } from '../utils/errors.js';

export async function getFoodByBarcode(fastify: FastifyInstance, barcode: string) {
  // Check local cache first
  const cached = await fastify.prisma.foodItem.findUnique({ where: { barcode } });
  if (cached) return cached;

  // Check Redis cache
  const redisKey = `off:${barcode}`;
  const redisCached = await fastify.redis.get(redisKey);
  if (redisCached) {
    const parsed = JSON.parse(redisCached);
    // Insert into DB from Redis cache
    return fastify.prisma.foodItem.create({
      data: {
        barcode,
        ...parsed,
        source: 'OPENFOODFACTS',
      },
    });
  }

  // Fetch from OpenFoodFacts
  const offData = await lookupBarcode(barcode);
  if (!offData) {
    throw new NotFoundError('Product');
  }

  // Cache raw response in Redis (24h)
  await fastify.redis.set(redisKey, JSON.stringify(offData), 'EX', 86400);

  // Insert into DB
  return fastify.prisma.foodItem.create({
    data: {
      barcode,
      name: offData.name,
      brand: offData.brand,
      servingSizeG: offData.servingSizeG,
      caloriesPer100g: offData.caloriesPer100g,
      proteinPer100g: offData.proteinPer100g,
      carbsPer100g: offData.carbsPer100g,
      fatPer100g: offData.fatPer100g,
      fiberPer100g: offData.fiberPer100g,
      sugarPer100g: offData.sugarPer100g,
      sodiumPer100g: offData.sodiumPer100g,
      imageUrl: offData.imageUrl,
      source: 'OPENFOODFACTS',
      offProductJson: offData.rawJson as any,
    },
  });
}

export async function searchFood(
  fastify: FastifyInstance,
  query: string,
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;
  const where = { name: { contains: query, mode: 'insensitive' as const } };

  const [items, total] = await Promise.all([
    fastify.prisma.foodItem.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    fastify.prisma.foodItem.count({ where }),
  ]);

  return {
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getFoodById(fastify: FastifyInstance, id: string) {
  const item = await fastify.prisma.foodItem.findUnique({ where: { id } });
  if (!item) throw new NotFoundError('Food item');
  return item;
}

export async function createFoodItem(fastify: FastifyInstance, data: CreateFoodItemInput) {
  return fastify.prisma.foodItem.create({
    data: {
      ...data,
      source: 'MANUAL',
    },
  });
}

export async function updateFoodItem(
  fastify: FastifyInstance,
  id: string,
  data: Partial<CreateFoodItemInput>,
) {
  const existing = await fastify.prisma.foodItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Food item');
  return fastify.prisma.foodItem.update({ where: { id }, data });
}
