import { logger } from '../utils/logger.js';

const OFF_BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';
const USER_AGENT = 'MacroTracker/1.0 (https://github.com/macrotracker)';

interface OffProduct {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  image_url?: string;
  nutriments?: Record<string, number>;
}

interface OffResponse {
  status: number;
  product?: OffProduct;
}

export interface ParsedFoodData {
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
  imageUrl: string | null;
  rawJson: unknown;
}

export async function lookupBarcode(barcode: string): Promise<ParsedFoodData | null> {
  const url = `${OFF_BASE_URL}/${barcode}?fields=product_name,brands,nutriments,serving_size,image_url`;

  logger.debug({ barcode, url }, 'Looking up barcode on OpenFoodFacts');

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    logger.warn({ barcode, status: response.status }, 'OpenFoodFacts API error');
    return null;
  }

  const data = (await response.json()) as OffResponse;

  if (data.status === 0 || !data.product) {
    logger.debug({ barcode }, 'Product not found on OpenFoodFacts');
    return null;
  }

  const product = data.product;
  const n = product.nutriments ?? {};

  return {
    name: product.product_name || `Unknown Product (${barcode})`,
    brand: product.brands || null,
    servingSizeG: parseServingSize(product.serving_size),
    caloriesPer100g: n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0,
    proteinPer100g: n['proteins_100g'] ?? 0,
    carbsPer100g: n['carbohydrates_100g'] ?? 0,
    fatPer100g: n['fat_100g'] ?? 0,
    fiberPer100g: n['fiber_100g'] ?? null,
    sugarPer100g: n['sugars_100g'] ?? null,
    sodiumPer100g: n['sodium_100g'] ?? null,
    imageUrl: product.image_url || null,
    rawJson: data.product,
  };
}

function parseServingSize(servingSize?: string): number {
  if (!servingSize) return 100;
  const match = servingSize.match(/(\d+(?:\.\d+)?)\s*g/i);
  return match ? parseFloat(match[1]) : 100;
}
