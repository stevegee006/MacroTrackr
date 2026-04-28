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
    // Detect HTML error pages (OFF sometimes returns 200 with an HTML maintenance page)
    const text = await res.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      logger.warn({ label, url }, 'OpenFoodFacts returned HTML (likely error page)');
      return [];
    }
    const data = JSON.parse(text) as OffSearchResponse;
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

async function fetchAlicious(query: string, pageSize: number, label: string): Promise<OffSearchProduct[]> {
  const url = `${OFF_SEARCH_ALICIOUS_URL}?${new URLSearchParams({
    q: query,
    page_size: String(pageSize),
  }).toString()}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      logger.warn({ label, status: res.status, url }, 'OFF search-a-licious error');
      return [];
    }
    const text = await res.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      logger.warn({ label, url }, 'OFF search-a-licious returned HTML (likely error page)');
      return [];
    }
    const data = JSON.parse(text) as AliciousResponse;
    const hits = data.hits ?? [];
    // search-a-licious response: brands is an array, not a string
    return hits
      .filter((h): h is AliciousHit & { code: string } => !!h.code)
      .map((h) => {
        const rawBrands = (h as unknown as { brands?: unknown }).brands;
        const brands = Array.isArray(rawBrands) ? rawBrands.join(', ') : (typeof rawBrands === 'string' ? rawBrands : undefined);
        return {
          code: h.code,
          product_name:
            typeof h.product_name === 'string'
              ? h.product_name
              : h.product_name?.en,
          brands,
          serving_size: h.serving_size,
          image_url: h.image_url,
          categories: h.categories,
          nutriments: h.nutriments,
        };
      });
  } catch (err) {
    logger.warn({ label, err }, 'OFF search-a-licious fetch failed');
    return [];
  }
}

export async function searchProducts(query: string, limit: number = 15): Promise<OffSearchResult[]> {
  const sanitized = sanitizeQuery(query);
  if (!sanitized) return [];

  // Fetch larger pages — many OFF entries lack complete calorie data
  const fetchSize = Math.max(limit * 3, 30);

  const words = sanitized.split(' ');
  const firstWord = words[0];
  const isMultiWord = words.length > 1;

  // Strategy:
  //  1. Run search-a-licious twice in parallel:
  //     a) Brand search — just the first word (e.g. "subway") to surface ALL brand items
  //     b) Full query — all words for general text search
  //  2. Brand search results win priority (so "Subway" items appear first for branded queries)
  //  3. Legacy cgi/search.pl as backup if alicious is unavailable
  //  4. Apply relevance filter — must contain at least one significant query word
  //
  // We dropped the v2 brand_tags endpoint because world.openfoodfacts.org/api/v2 has been
  // returning 503 errors. search-a-licious already includes brand fields in its query.
  const brandQueryDifferent = isMultiWord && firstWord.length >= 3;

  logger.info({ query, sanitized, firstWord, brandQueryDifferent }, 'OFF search starting');

  const [brandHits, fullHits, legacyProducts] = await Promise.all([
    brandQueryDifferent ? fetchAlicious(firstWord, fetchSize, 'brand') : Promise.resolve([] as OffSearchProduct[]),
    fetchAlicious(sanitized, fetchSize, 'full'),
    fetchOff(
      `${OFF_SEARCH_LEGACY_URL}?${new URLSearchParams({
        search_terms: sanitized,
        search_simple: '1',
        action: 'process',
        json: '1',
        page_size: String(fetchSize),
        fields: FIELDS,
      }).toString()}`,
      'legacy',
    ),
  ]);

  logger.info(
    {
      query,
      brandHitCount: brandHits.length,
      fullHitCount: fullHits.length,
      legacyCount: legacyProducts.length,
    },
    'OFF search raw counts',
  );

  // Words 3+ chars that aren't common stopwords (used for relevance filtering)
  const STOPWORDS = new Set([
    'the', 'and', 'with', 'for', 'from', 'this', 'that', 'food', 'low', 'fat', 'free',
    'one', 'two', 'cup', 'cups', 'tbsp', 'tsp', 'piece', 'serving',
  ]);
  const queryWords = sanitized.split(' ').filter((w) => w.length >= 3 && !STOPWORDS.has(w));

  /** Result is relevant if its name/brand contains at least one significant query word */
  function isRelevant(p: OffSearchResult): boolean {
    if (queryWords.length === 0) return true;
    const haystack = `${p.name} ${p.brand ?? ''}`.toLowerCase();
    return queryWords.some((w) => haystack.includes(w));
  }

  // For brand hits, also check if the rest of the query terms match (gives Subway+ColdCut > Subway+other)
  const remainingWords = queryWords.filter((w) => w !== firstWord);
  function brandHitScore(p: OffSearchResult): number {
    if (remainingWords.length === 0) return 0;
    const haystack = `${p.name} ${p.brand ?? ''}`.toLowerCase();
    return remainingWords.filter((w) => haystack.includes(w)).length;
  }

  // Map and dedupe brand results, then sort by how many remaining query words they match
  const brandSeen = new Set<string>();
  const brandMapped: OffSearchResult[] = [];
  for (const p of brandHits) {
    if (brandSeen.has(p.code)) continue;
    brandSeen.add(p.code);
    const m = mapOffProduct(p);
    if (m && isRelevant(m)) brandMapped.push(m);
  }
  brandMapped.sort((a, b) => brandHitScore(b) - brandHitScore(a));

  // Merge: brand-relevant hits first, then full query hits, then legacy fallback
  const seen = new Set<string>(brandMapped.map((r) => r.code));
  const results: OffSearchResult[] = [...brandMapped];
  let filteredOut = 0;
  for (const products of [fullHits, legacyProducts]) {
    for (const p of products) {
      if (seen.has(p.code)) continue;
      seen.add(p.code);
      const mapped = mapOffProduct(p);
      if (!mapped) continue;
      if (!isRelevant(mapped)) {
        filteredOut++;
        continue;
      }
      results.push(mapped);
      if (results.length >= limit) break;
    }
    if (results.length >= limit) break;
  }

  const trimmed = results.slice(0, limit);
  logger.info({ query, finalCount: trimmed.length, filteredOut }, 'OFF search final count');
  return trimmed;
}
