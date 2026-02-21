import type { FastifyInstance } from 'fastify';
import type { CreateFoodItemInput } from '@macrotracker/shared';
import { labelScanResponseSchema } from '@macrotracker/shared';
import { lookupBarcode } from './openfoodfacts.service.js';
import { getOpenAIClient, visionCompletion } from './openai.service.js';
import { NotFoundError, AppError } from '../utils/errors.js';

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

const LABEL_SCAN_SYSTEM_PROMPT = `You are a nutrition label reader. Given a photo of a nutrition/supplement facts label, extract the nutritional information accurately.

IMPORTANT RULES:
- Read the serving size from the label carefully.
- Extract ALL values per 100g. If the label shows values per serving only, calculate per-100g values using: (value / servingSizeG) * 100
- If the label already shows "per 100g" or "per 100ml" values, use those directly.
- If a nutrient is not listed on the label, return null for that field.
- For the product name: read it from the label/packaging if visible, otherwise use "Scanned Food Item".
- For the brand: read it from the label/packaging if visible.
- Round all values to at most 2 decimal places.

Respond ONLY with valid JSON matching this exact structure:
{
  "name": "<product name>",
  "brand": "<brand name or null>",
  "servingSizeG": <serving size in grams>,
  "caloriesPer100g": <number>,
  "proteinPer100g": <number>,
  "carbsPer100g": <number>,
  "fatPer100g": <number>,
  "fiberPer100g": <number or null>,
  "sugarPer100g": <number or null>,
  "sodiumPer100g": <number or null>
}`;

export async function extractNutritionFromLabel(
  fastify: FastifyInstance,
  userId: string,
  imageBase64: string,
) {
  const client = await getOpenAIClient(fastify, userId);

  const result = await visionCompletion(
    client,
    LABEL_SCAN_SYSTEM_PROMPT,
    'Extract the nutrition information from this label. Return JSON only.',
    imageBase64,
    {
      model: 'gpt-4o',
      temperature: 0.1,
      maxTokens: 1000,
    },
  );

  const parsed = labelScanResponseSchema.safeParse(JSON.parse(result.content));
  if (!parsed.success) {
    throw new AppError(502, 'AI_PARSE_ERROR', 'Failed to parse nutrition data from label. Please try again with a clearer photo.');
  }

  // Create FoodItem in DB
  return fastify.prisma.foodItem.create({
    data: {
      name: parsed.data.name,
      brand: parsed.data.brand ?? null,
      servingSizeG: parsed.data.servingSizeG,
      caloriesPer100g: parsed.data.caloriesPer100g,
      proteinPer100g: parsed.data.proteinPer100g,
      carbsPer100g: parsed.data.carbsPer100g,
      fatPer100g: parsed.data.fatPer100g,
      fiberPer100g: parsed.data.fiberPer100g ?? null,
      sugarPer100g: parsed.data.sugarPer100g ?? null,
      sodiumPer100g: parsed.data.sodiumPer100g ?? null,
      source: 'LABEL_SCAN',
    },
  });
}
