import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parsedFoodItemSchema, type ParsedFoodItem } from '@macrotracker/shared';
import { aiPdfCompletion, aiVisionCompletion } from './ai-provider.service.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const SYSTEM_PROMPT = `You are a nutrition data extraction expert. Extract every food item from the provided document/image into a structured JSON array.

For each food item, return an object with these fields:
- name: string (full product/menu item name, e.g. "6\\" Italian B.M.T.")
- brand: string or null (the restaurant or brand name, e.g. "Subway")
- servingSizeG: number (the serving size in GRAMS as listed on the document)
- caloriesPer100g: number (calculated by dividing total calories by serving grams, then * 100)
- proteinPer100g: number (same calculation)
- carbsPer100g: number (same calculation)
- fatPer100g: number (same calculation)
- fiberPer100g: number or null
- sugarPer100g: number or null
- sodiumPer100g: number or null (in GRAMS, divide mg by 1000)

CRITICAL: All nutrition values must be normalized to per-100g. If the document shows "440 cal per 226g serving", the caloriesPer100g should be 195 (440 / 226 * 100, rounded).

If a serving size is given in oz/ml/cups instead of grams, do your best to estimate grams (1 oz ≈ 28g). If you can't determine a sensible serving size, use 100g as default.

Skip items where you cannot extract calorie data. Skip drink items unless explicitly nutrition-labeled.

Return a JSON array directly (no wrapper object). Maximum 200 items per response.`;

const responseSchema = z.array(parsedFoodItemSchema);

function parseAiResponse(content: string): ParsedFoodItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to extract JSON array from response (sometimes wrapped in prose)
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) {
      throw new AppError(502, 'AI_PARSE_ERROR', 'AI did not return valid JSON');
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new AppError(502, 'AI_PARSE_ERROR', 'AI did not return valid JSON');
    }
  }

  // Allow either bare array or { items: [...] } wrapper
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'items' in parsed) {
    parsed = (parsed as { items: unknown }).items;
  }

  const result = responseSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn({ errors: result.error.issues }, 'AI response failed validation');
    throw new AppError(502, 'AI_PARSE_ERROR', 'AI response did not match expected food item structure');
  }
  return result.data;
}

export async function parsePdfIngest(
  fastify: FastifyInstance,
  userId: string,
  pdfBase64: string,
): Promise<ParsedFoodItem[]> {
  const result = await aiPdfCompletion(
    fastify,
    userId,
    SYSTEM_PROMPT,
    'Extract every food item from this nutrition document into a JSON array.',
    pdfBase64,
  );
  return parseAiResponse(result.content);
}

export async function parseImagesIngest(
  fastify: FastifyInstance,
  userId: string,
  imagesBase64: string[],
): Promise<ParsedFoodItem[]> {
  // Run image parsing in parallel for speed, then merge
  const results = await Promise.all(
    imagesBase64.map((img) =>
      aiVisionCompletion(
        fastify,
        userId,
        SYSTEM_PROMPT,
        'Extract every food item from this image into a JSON array.',
        img,
        { maxTokens: 4000 },
      ),
    ),
  );

  const merged: ParsedFoodItem[] = [];
  for (const r of results) {
    try {
      merged.push(...parseAiResponse(r.content));
    } catch (err) {
      logger.warn({ err }, 'Failed to parse one image response, continuing');
    }
  }

  if (merged.length === 0) {
    throw new AppError(502, 'AI_PARSE_ERROR', 'AI could not extract any food items from the images');
  }
  return merged;
}

// ─── CSV parsing ──────────────────────────────────────────────

const CSV_HEADER_ALIASES: Record<string, keyof ParsedFoodItem> = {
  name: 'name',
  product_name: 'name',
  food_name: 'name',
  product: 'name',
  item: 'name',
  brand: 'brand',
  manufacturer: 'brand',
  restaurant: 'brand',
  serving_size_g: 'servingSizeG',
  serving_g: 'servingSizeG',
  serving: 'servingSizeG',
  serving_size: 'servingSizeG',
  calories: 'caloriesPer100g',
  cal: 'caloriesPer100g',
  kcal: 'caloriesPer100g',
  energy: 'caloriesPer100g',
  protein: 'proteinPer100g',
  protein_g: 'proteinPer100g',
  carbs: 'carbsPer100g',
  carbs_g: 'carbsPer100g',
  carbohydrates: 'carbsPer100g',
  carbohydrate: 'carbsPer100g',
  fat: 'fatPer100g',
  fat_g: 'fatPer100g',
  fiber: 'fiberPer100g',
  fiber_g: 'fiberPer100g',
  fibre: 'fiberPer100g',
  sugar: 'sugarPer100g',
  sugar_g: 'sugarPer100g',
  sugars: 'sugarPer100g',
  sodium: 'sodiumPer100g',
  sodium_g: 'sodiumPer100g',
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, '_').replace(/[()]/g, '');
}

export async function parseCsvIngest(csvText: string): Promise<ParsedFoodItem[]> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new AppError(400, 'CSV_INVALID', 'CSV must have a header row and at least one data row');
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const fieldMap: Record<number, keyof ParsedFoodItem> = {};
  headers.forEach((h, idx) => {
    const field = CSV_HEADER_ALIASES[h];
    if (field) fieldMap[idx] = field;
  });

  if (!Object.values(fieldMap).includes('name')) {
    throw new AppError(400, 'CSV_INVALID', 'CSV must include a "name" column');
  }
  if (!Object.values(fieldMap).includes('caloriesPer100g')) {
    throw new AppError(400, 'CSV_INVALID', 'CSV must include a "calories" column');
  }

  const items: ParsedFoodItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const raw: Record<string, unknown> = {
      brand: null,
      servingSizeG: 100,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
    };

    for (const [idxStr, field] of Object.entries(fieldMap)) {
      const value = cells[parseInt(idxStr)];
      if (value === undefined || value === '') continue;
      if (field === 'name' || field === 'brand') {
        raw[field] = value;
      } else {
        const num = parseFloat(value);
        if (!isFinite(num)) continue;
        raw[field] = num;
      }
    }

    const result = parsedFoodItemSchema.safeParse(raw);
    if (result.success) {
      items.push(result.data);
    } else {
      logger.warn({ row: i + 1, errors: result.error.issues }, 'Skipping invalid CSV row');
    }
  }

  if (items.length === 0) {
    throw new AppError(400, 'CSV_EMPTY', 'No valid food items found in CSV');
  }
  return items;
}

// ─── Bulk import ──────────────────────────────────────────────

export async function bulkImportFoods(
  fastify: FastifyInstance,
  items: ParsedFoodItem[],
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const item of items) {
    // Dedupe by case-insensitive name + brand match
    const existing = await fastify.prisma.foodItem.findFirst({
      where: {
        name: { equals: item.name, mode: 'insensitive' },
        brand: item.brand
          ? { equals: item.brand, mode: 'insensitive' }
          : null,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await fastify.prisma.foodItem.create({
      data: {
        name: item.name,
        brand: item.brand,
        servingSizeG: item.servingSizeG,
        caloriesPer100g: item.caloriesPer100g,
        proteinPer100g: item.proteinPer100g,
        carbsPer100g: item.carbsPer100g,
        fatPer100g: item.fatPer100g,
        fiberPer100g: item.fiberPer100g ?? null,
        sugarPer100g: item.sugarPer100g ?? null,
        sodiumPer100g: item.sodiumPer100g ?? null,
        source: 'AI_INGEST',
      },
    });
    created++;
  }

  return { created, skipped };
}
