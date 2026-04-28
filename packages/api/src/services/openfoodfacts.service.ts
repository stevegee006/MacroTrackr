import { logger } from '../utils/logger.js';

const OFF_BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const USER_AGENT = 'MacroTrackr/1.0 (https://github.com/macrotrackr)';

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

export interface OffSearchResult {
  code: string; // barcode
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
  categories?: string | null;
}

interface OffSearchProduct {
  code: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  image_url?: string;
  categories?: string;
  nutriments?: Record<string, number>;
}

interface OffSearchResponse {
  products?: OffSearchProduct[];
}

export async function searchProducts(query: string, limit: number = 15): Promise<OffSearchResult[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(limit),
    fields: 'code,product_name,brands,nutriments,serving_size,image_url,categories',
  });
  const url = `${OFF_SEARCH_URL}?${params.toString()}`;

  logger.debug({ query, url }, 'Searching OpenFoodFacts');

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    logger.warn({ query, status: response.status }, 'OpenFoodFacts search error');
    return [];
  }

  const data = (await response.json()) as OffSearchResponse;
  const products = data.products ?? [];

  return products
    .filter((p) => p.code && (p.product_name || p.brands))
    .map((p) => {
      const n = p.nutriments ?? {};
      return {
        code: p.code,
        name: p.product_name || p.brands || `Product ${p.code}`,
        brand: p.brands || null,
        servingSizeG: parseServingSize(p.serving_size),
        caloriesPer100g: n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0,
        proteinPer100g: n['proteins_100g'] ?? 0,
        carbsPer100g: n['carbohydrates_100g'] ?? 0,
        fatPer100g: n['fat_100g'] ?? 0,
        fiberPer100g: n['fiber_100g'] ?? null,
        sugarPer100g: n['sugars_100g'] ?? null,
        sodiumPer100g: n['sodium_100g'] ?? null,
        imageUrl: p.image_url || null,
        categories: p.categories || null,
      };
    })
    // Filter out products with no calorie data (incomplete entries)
    .filter((p) => p.caloriesPer100g > 0);
}
