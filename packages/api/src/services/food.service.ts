import type { FastifyInstance } from 'fastify';
import type { CreateFoodItemInput } from '@macrotracker/shared';
import { labelScanResponseSchema } from '@macrotracker/shared';
import { lookupBarcode, searchProducts as offSearchProducts, type OffSearchResult } from './openfoodfacts.service.js';
import { searchFoods as usdaSearchFoods, type UsdaParsedFood } from './usda.service.js';
import { getUsdaApiKey } from './app-config.service.js';
import { aiVisionCompletion, aiChatCompletion } from './ai-provider.service.js';
import { NotFoundError, AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { mapFoodItemRow } from '../utils/map-food-row.js';

export async function getFoodByBarcode(fastify: FastifyInstance, barcode: string) {
  // Check local cache first
  const cached = await fastify.prisma.foodItem.findUnique({ where: { barcode } });
  if (cached) return cached;

  // Check Redis cache
  const redisKey = `off:${barcode}`;
  const redisCached = await fastify.redis.get(redisKey);
  if (redisCached) {
    const parsed = JSON.parse(redisCached) as Awaited<ReturnType<typeof lookupBarcode>>;
    if (parsed) {
      return fastify.prisma.foodItem.create({
        data: {
          barcode,
          name: parsed.name,
          brand: parsed.brand,
          servingSizeG: parsed.servingSizeG,
          caloriesPer100g: parsed.caloriesPer100g,
          proteinPer100g: parsed.proteinPer100g,
          carbsPer100g: parsed.carbsPer100g,
          fatPer100g: parsed.fatPer100g,
          fiberPer100g: parsed.fiberPer100g,
          sugarPer100g: parsed.sugarPer100g,
          sodiumPer100g: parsed.sodiumPer100g,
          imageUrl: parsed.imageUrl,
          source: 'OPENFOODFACTS',
          offProductJson: parsed.rawJson as any,
        },
      });
    }
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
  // Strip non-alphanumeric/space chars so "MoBettahs" matches "Mo'Bettahs"
  const normalized = `%${query.replace(/[^a-zA-Z0-9 ]/g, '')}%`;

  const items = await fastify.prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM food_items
     WHERE regexp_replace(name, '[^a-zA-Z0-9 ]', '', 'g') ILIKE $1
        OR regexp_replace(COALESCE(brand, ''), '[^a-zA-Z0-9 ]', '', 'g') ILIKE $1
     ORDER BY name ASC
     LIMIT $2 OFFSET $3`,
    normalized,
    limit,
    skip,
  );

  const countResult = await fastify.prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT count(*) FROM food_items
     WHERE regexp_replace(name, '[^a-zA-Z0-9 ]', '', 'g') ILIKE $1
        OR regexp_replace(COALESCE(brand, ''), '[^a-zA-Z0-9 ]', '', 'g') ILIKE $1`,
    normalized,
  );
  const total = Number(countResult[0].count);

  const data = items.map(mapFoodItemRow);

  return {
    data,
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
  const result = await aiVisionCompletion(
    fastify,
    userId,
    LABEL_SCAN_SYSTEM_PROMPT,
    'Extract the nutrition information from this label. Return JSON only.',
    imageBase64,
    {
      tier: 'vision',
      temperature: 0.1,
      maxTokens: 1000,
    },
  );

  let jsonContent: unknown;
  try {
    // Strip markdown code fences if present (```json ... ```)
    const cleaned = result.content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    jsonContent = JSON.parse(cleaned);
  } catch {
    logger.error({ raw: result.content.slice(0, 500) }, 'Label scan: failed to parse AI JSON');
    throw new AppError(502, 'AI_PARSE_ERROR', 'Failed to parse nutrition data from label. Please try again with a clearer photo.');
  }

  const parsed = labelScanResponseSchema.safeParse(jsonContent);
  if (!parsed.success) {
    logger.error({ errors: parsed.error.flatten(), raw: result.content.slice(0, 500) }, 'Label scan: Zod validation failed');
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

export async function updateFoodFromLabel(
  fastify: FastifyInstance,
  userId: string,
  foodId: string,
  imageBase64: string,
) {
  const existing = await fastify.prisma.foodItem.findUnique({ where: { id: foodId } });
  if (!existing) throw new NotFoundError('Food item');

  const result = await aiVisionCompletion(
    fastify,
    userId,
    LABEL_SCAN_SYSTEM_PROMPT,
    'Extract the nutrition information from this label. Return JSON only.',
    imageBase64,
    {
      tier: 'vision',
      temperature: 0.1,
      maxTokens: 1000,
    },
  );

  let jsonContent: unknown;
  try {
    const cleaned = result.content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    jsonContent = JSON.parse(cleaned);
  } catch {
    logger.error({ raw: result.content.slice(0, 500) }, 'Label rescan: failed to parse AI JSON');
    throw new AppError(502, 'AI_PARSE_ERROR', 'Failed to parse nutrition data from label. Please try again with a clearer photo.');
  }

  const parsed = labelScanResponseSchema.safeParse(jsonContent);
  if (!parsed.success) {
    logger.error({ errors: parsed.error.flatten(), raw: result.content.slice(0, 500) }, 'Label rescan: Zod validation failed');
    throw new AppError(502, 'AI_PARSE_ERROR', 'Failed to parse nutrition data from label. Please try again with a clearer photo.');
  }

  // Update existing food item in-place (keeps barcode association)
  return fastify.prisma.foodItem.update({
    where: { id: foodId },
    data: {
      name: parsed.data.name,
      brand: parsed.data.brand ?? existing.brand,
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

const FOOD_ESTIMATE_SYSTEM_PROMPT = `You are a nutrition expert. Given a food description and weight in grams, estimate the macronutrient content per 100g.

Use your knowledge of USDA food composition databases and common nutritional values.

IMPORTANT RULES:
- Estimate values per 100g of the described food.
- Use the food description to determine the most likely food item and preparation method.
- If the description is ambiguous, assume the most common form (e.g., "chicken breast" = boneless, skinless, raw).
- Round all values to at most 1 decimal place.
- For the product name: use a clean, descriptive name based on the description.
- If a nutrient value is unknown, provide your best estimate rather than null.

Respond ONLY with valid JSON matching this exact structure:
{
  "name": "<descriptive food name>",
  "brand": null,
  "servingSizeG": <the weight the user provided>,
  "caloriesPer100g": <number>,
  "proteinPer100g": <number>,
  "carbsPer100g": <number>,
  "fatPer100g": <number>,
  "fiberPer100g": <number or null>,
  "sugarPer100g": <number or null>,
  "sodiumPer100g": <number or null>
}`;

export async function estimateFoodMacros(
  fastify: FastifyInstance,
  userId: string,
  description: string,
  weightG: number,
) {
  const userPrompt = `Estimate the nutrition per 100g for: "${description}" (weighed at ${weightG}g). Return JSON only.`;

  const result = await aiChatCompletion(
    fastify,
    userId,
    FOOD_ESTIMATE_SYSTEM_PROMPT,
    userPrompt,
    {
      tier: 'light',
      temperature: 0.2,
      maxTokens: 500,
    },
  );

  let jsonContent: unknown;
  try {
    const cleaned = result.content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    jsonContent = JSON.parse(cleaned);
  } catch {
    logger.error({ raw: result.content.slice(0, 500) }, 'AI estimate: failed to parse AI JSON');
    throw new AppError(502, 'AI_PARSE_ERROR', 'Failed to estimate nutrition data. Please try again with a more specific description.');
  }

  const parsed = labelScanResponseSchema.safeParse(jsonContent);
  if (!parsed.success) {
    logger.error({ errors: parsed.error.flatten(), raw: result.content.slice(0, 500) }, 'AI estimate: Zod validation failed');
    throw new AppError(502, 'AI_PARSE_ERROR', 'Failed to estimate nutrition data. Please try again with a more specific description.');
  }

  return fastify.prisma.foodItem.create({
    data: {
      name: parsed.data.name,
      brand: null,
      servingSizeG: weightG,
      caloriesPer100g: parsed.data.caloriesPer100g,
      proteinPer100g: parsed.data.proteinPer100g,
      carbsPer100g: parsed.data.carbsPer100g,
      fatPer100g: parsed.data.fatPer100g,
      fiberPer100g: parsed.data.fiberPer100g ?? null,
      sugarPer100g: parsed.data.sugarPer100g ?? null,
      sodiumPer100g: parsed.data.sodiumPer100g ?? null,
      source: 'AI_ESTIMATE',
    },
  });
}

export interface ExternalSearchResult {
  source: 'USDA' | 'OPENFOODFACTS';
  id: string; // fdcId for USDA, barcode for OFF
  name: string;
  brand: string | null;
  servingSizeG: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
  sugarPer100g: number | null;
  sodiumPer100g: number | null;
  categories?: string | null;
}

export async function searchExternalFoods(
  fastify: FastifyInstance,
  query: string,
  limit: number,
): Promise<ExternalSearchResult[]> {
  // Cache version bumped (v3) when OFF search switched to 3-pronged approach
  const cacheKey = `external:search:v3:${query.toLowerCase().trim()}:${limit}`;
  const cached = await fastify.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as ExternalSearchResult[];
  }

  const apiKey = await getUsdaApiKey(fastify);
  const halfLimit = Math.ceil(limit / 2);

  // Run USDA and OpenFoodFacts searches in parallel — both are best-effort
  const [usdaResults, offResults] = await Promise.allSettled([
    apiKey ? usdaSearchFoods(apiKey, query, halfLimit) : Promise.resolve([] as UsdaParsedFood[]),
    offSearchProducts(query, halfLimit),
  ]);

  const usda: UsdaParsedFood[] = usdaResults.status === 'fulfilled' ? usdaResults.value : [];
  const off: OffSearchResult[] = offResults.status === 'fulfilled' ? offResults.value : [];

  if (usdaResults.status === 'rejected') {
    logger.warn({ err: usdaResults.reason }, 'USDA search failed');
  }
  if (offResults.status === 'rejected') {
    logger.warn({ err: offResults.reason }, 'OpenFoodFacts search failed');
  }

  // If USDA isn't configured AND OFF returned nothing, surface a clear error
  if (!apiKey && off.length === 0 && offResults.status === 'rejected') {
    throw new AppError(502, 'EXTERNAL_SEARCH_FAILED', 'External food search failed. Try again later.');
  }

  // Map both into a unified result format
  const merged: ExternalSearchResult[] = [
    ...usda.map((f) => ({
      source: 'USDA' as const,
      id: String(f.fdcId),
      name: f.name,
      brand: f.brand,
      servingSizeG: f.servingSizeG,
      caloriesPer100g: f.caloriesPer100g,
      proteinPer100g: f.proteinPer100g,
      carbsPer100g: f.carbsPer100g,
      fatPer100g: f.fatPer100g,
      fiberPer100g: f.fiberPer100g,
      sugarPer100g: f.sugarPer100g,
      sodiumPer100g: f.sodiumPer100g,
    })),
    ...off.map((f) => ({
      source: 'OPENFOODFACTS' as const,
      id: f.code,
      name: f.name,
      brand: f.brand,
      servingSizeG: f.servingSizeG,
      caloriesPer100g: f.caloriesPer100g,
      proteinPer100g: f.proteinPer100g,
      carbsPer100g: f.carbsPer100g,
      fatPer100g: f.fatPer100g,
      fiberPer100g: f.fiberPer100g,
      sugarPer100g: f.sugarPer100g,
      sodiumPer100g: f.sodiumPer100g,
      categories: f.categories,
    })),
  ];

  // Cache combined results for 24h (only if non-empty)
  if (merged.length > 0) {
    await fastify.redis.set(cacheKey, JSON.stringify(merged), 'EX', 86400);
  }

  return merged;
}

export async function importOffFood(
  fastify: FastifyInstance,
  food: OffSearchResult,
) {
  // OFF foods use their actual barcode
  const existing = await fastify.prisma.foodItem.findUnique({ where: { barcode: food.code } });
  if (existing) return existing;

  return fastify.prisma.foodItem.create({
    data: {
      barcode: food.code,
      name: food.name,
      brand: food.brand,
      servingSizeG: food.servingSizeG,
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      fiberPer100g: food.fiberPer100g,
      sugarPer100g: food.sugarPer100g,
      sodiumPer100g: food.sodiumPer100g,
      imageUrl: food.imageUrl,
      source: 'OPENFOODFACTS',
    },
  });
}

export async function importUsdaFood(
  fastify: FastifyInstance,
  food: UsdaParsedFood,
) {
  const barcode = `usda:${food.fdcId}`;

  // Check if already imported (dedup by barcode)
  const existing = await fastify.prisma.foodItem.findUnique({ where: { barcode } });
  if (existing) return existing;

  return fastify.prisma.foodItem.create({
    data: {
      barcode,
      name: food.name,
      brand: food.brand,
      servingSizeG: food.servingSizeG,
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      fiberPer100g: food.fiberPer100g,
      sugarPer100g: food.sugarPer100g,
      sodiumPer100g: food.sodiumPer100g,
      source: 'USDA',
    },
  });
}
