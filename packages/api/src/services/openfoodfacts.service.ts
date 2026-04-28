import { logger } from '../utils/logger.js';

const OFF_BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_SEARCH_V2_URL = 'https://world.openfoodfacts.org/api/v2/search';
const OFF_SEARCH_LEGACY_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_SEARCH_ALICIOUS_URL = 'https://search.openfoodfacts.org/search';
// OFF requires a valid contact URL or email in User-Agent
const USER_AGENT = 'MacroTrackr/1.0 (https://github.com/stevegee006/MacroTrackr)';

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

function mapOffProduct(p: OffSearchProduct): OffSearchResult | null {
  if (!p.code || (!p.product_name && !p.brands)) return null;
  const n = p.nutriments ?? {};
  const cal = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0;
  if (!cal || cal <= 0) return null;
  return {
    code: p.code,
    name: p.product_name || p.brands || `Product ${p.code}`,
    brand: p.brands || null,
    servingSizeG: parseServingSize(p.serving_size),
    caloriesPer100g: cal,
    proteinPer100g: n['proteins_100g'] ?? 0,
    carbsPer100g: n['carbohydrates_100g'] ?? 0,
    fatPer100g: n['fat_100g'] ?? 0,
    fiberPer100g: n['fiber_100g'] ?? null,
    sugarPer100g: n['sugars_100g'] ?? null,
    sodiumPer100g: n['sodium_100g'] ?? null,
    imageUrl: p.image_url || null,
    categories: p.categories || null,
  };
}

/** Sanitize: strip special chars (commas, quotes, parens), collapse whitespace, lowercase */
function sanitizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Convert query into a brand tag slug — uses only the FIRST word.
 * "Subway, Italian BMT" → "subway"  (matches OFF brand tag)
 * "Mo'Bettahs Hawaiian" → "mo-bettahs"
 * "Trader Joe's" → "trader" — multi-word brands won't always match, that's ok
 */
function toBrandTag(q: string): string {
  const sanitized = sanitizeQuery(q);
  if (!sanitized) return '';
  const firstWord = sanitized.split(' ')[0];
  return firstWord.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const FIELDS = 'code,product_name,brands,nutriments,serving_size,image_url,categories';

async function fetchOff(url: string, label: string): Promise<OffSearchProduct[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      logger.warn({ label, status: res.status, url }, 'OpenFoodFacts search error');
      return [];
    }
    const data = (await res.json()) as OffSearchResponse;
    return data.products ?? [];
  } catch (err) {
    logger.warn({ label, err }, 'OpenFoodFacts fetch failed');
    return [];
  }
}

/** search-a-licious returns hits in a different shape — normalize to OffSearchProduct */
interface AliciousHit {
  code?: string;
  product_name?: string | { en?: string };
  brands?: string;
  serving_size?: string;
  image_url?: string;
  categories?: string;
  nutriments?: Record<string, number>;
}
interface AliciousResponse {
  hits?: AliciousHit[];
}

async function fetchAlicious(query: string, pageSize: number): Promise<OffSearchProduct[]> {
  const url = `${OFF_SEARCH_ALICIOUS_URL}?${new URLSearchParams({
    q: query,
    page_size: String(pageSize),
    fields: FIELDS,
  }).toString()}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, url }, 'OFF search-a-licious error');
      return [];
    }
    const data = (await res.json()) as AliciousResponse;
    const hits = data.hits ?? [];
    return hits
      .filter((h): h is AliciousHit & { code: string } => !!h.code)
      .map((h) => ({
        code: h.code,
        product_name:
          typeof h.product_name === 'string'
            ? h.product_name
            : h.product_name?.en,
        brands: h.brands,
        serving_size: h.serving_size,
        image_url: h.image_url,
        categories: h.categories,
        nutriments: h.nutriments,
      }));
  } catch (err) {
    logger.warn({ err }, 'OFF search-a-licious fetch failed');
    return [];
  }
}

export async function searchProducts(query: string, limit: number = 15): Promise<OffSearchResult[]> {
  const sanitized = sanitizeQuery(query);
  if (!sanitized) return [];

  // Fetch larger pages — many OFF entries lack complete calorie data and get filtered out
  const fetchSize = Math.max(limit * 4, 40);

  // 3-pronged search:
  //  1. search-a-licious — OFF's dedicated full-text search (best for free-text queries)
  //  2. Brand-tag search via v2 — surfaces branded products (Subway, McDonald's) using only the first word
  //  3. Legacy cgi/search.pl — fallback for older indexed products
  const brandTag = toBrandTag(query);
  const brandUrl = brandTag
    ? `${OFF_SEARCH_V2_URL}?${new URLSearchParams({
        brands_tags: brandTag,
        page_size: String(fetchSize),
        fields: FIELDS,
        sort_by: 'unique_scans_n',
      }).toString()}`
    : null;

  const legacyUrl = `${OFF_SEARCH_LEGACY_URL}?${new URLSearchParams({
    search_terms: sanitized,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(fetchSize),
    fields: FIELDS,
  }).toString()}`;

  logger.info({ query, sanitized, brandTag }, 'OFF search starting');

  const [aliciousProducts, brandProducts, legacyProducts] = await Promise.all([
    fetchAlicious(sanitized, fetchSize),
    brandUrl ? fetchOff(brandUrl, 'brand') : Promise.resolve([] as OffSearchProduct[]),
    fetchOff(legacyUrl, 'legacy'),
  ]);

  logger.info(
    {
      query,
      aliciousCount: aliciousProducts.length,
      brandCount: brandProducts.length,
      legacyCount: legacyProducts.length,
    },
    'OFF search raw counts',
  );

  // Merge order: brand (most relevant for branded queries) → alicious (best text match) → legacy fallback
  const seen = new Set<string>();
  const results: OffSearchResult[] = [];
  for (const p of [...brandProducts, ...aliciousProducts, ...legacyProducts]) {
    if (seen.has(p.code)) continue;
    seen.add(p.code);
    const mapped = mapOffProduct(p);
    if (mapped) results.push(mapped);
    if (results.length >= limit) break;
  }

  logger.info({ query, finalCount: results.length }, 'OFF search final count');
  return results;
}
