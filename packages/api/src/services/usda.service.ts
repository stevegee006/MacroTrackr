import { logger } from '../utils/logger.js';

const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

interface UsdaNutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface UsdaFoodItem {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: UsdaNutrient[];
  dataType: string;
}

interface UsdaSearchResponse {
  totalHits: number;
  foods: UsdaFoodItem[];
}

export interface UsdaParsedFood {
  fdcId: number;
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
  dataType: string;
}

// USDA nutrient IDs
const NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  CARBS: 1005,
  FAT: 1004,
  FIBER: 1079,
  SUGAR: 2000,
  SODIUM: 1093,
};

function getNutrientValue(nutrients: UsdaNutrient[], nutrientId: number): number | null {
  const n = nutrients.find((item) => item.nutrientId === nutrientId);
  return n ? n.value : null;
}

export async function searchFoods(
  apiKey: string,
  query: string,
  limit: number = 10,
): Promise<UsdaParsedFood[]> {
  const url = new URL(`${USDA_BASE_URL}/foods/search`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('query', query);
  url.searchParams.set('pageSize', String(limit));
  url.searchParams.set('dataType', 'Branded,Survey (FNDDS)');

  logger.debug({ query }, 'Searching USDA FDC');

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    logger.error({ err }, 'USDA FDC API network error');
    throw new Error('Could not reach USDA FoodData Central. Try again later.');
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logger.warn({ status: response.status, body: body.slice(0, 200) }, 'USDA FDC API error');
    if (response.status === 403 || response.status === 401) {
      throw new Error('Invalid USDA API key. Check your key in Admin > Settings.');
    }
    if (response.status === 429) {
      throw new Error('USDA API rate limit exceeded. Try again in a moment.');
    }
    throw new Error(`USDA API returned status ${response.status}`);
  }

  const data = (await response.json()) as UsdaSearchResponse;

  if (!data.foods) {
    return [];
  }

  return data.foods.map((food) => {
    const energy = getNutrientValue(food.foodNutrients, NUTRIENT_IDS.ENERGY) ?? 0;
    const protein = getNutrientValue(food.foodNutrients, NUTRIENT_IDS.PROTEIN) ?? 0;
    const carbs = getNutrientValue(food.foodNutrients, NUTRIENT_IDS.CARBS) ?? 0;
    const fat = getNutrientValue(food.foodNutrients, NUTRIENT_IDS.FAT) ?? 0;
    const fiber = getNutrientValue(food.foodNutrients, NUTRIENT_IDS.FIBER);
    const sugar = getNutrientValue(food.foodNutrients, NUTRIENT_IDS.SUGAR);
    const sodiumMg = getNutrientValue(food.foodNutrients, NUTRIENT_IDS.SODIUM);
    // USDA returns sodium in mg; our DB stores grams per 100g
    const sodiumG = sodiumMg !== null ? Math.round((sodiumMg / 1000) * 1000) / 1000 : null;

    let servingSizeG = 100;
    if (food.servingSize && food.servingSizeUnit?.toLowerCase() === 'g') {
      servingSizeG = food.servingSize;
    }

    return {
      fdcId: food.fdcId,
      name: food.description,
      brand: food.brandOwner || food.brandName || null,
      servingSizeG,
      caloriesPer100g: Math.round(energy * 10) / 10,
      proteinPer100g: Math.round(protein * 10) / 10,
      carbsPer100g: Math.round(carbs * 10) / 10,
      fatPer100g: Math.round(fat * 10) / 10,
      fiberPer100g: fiber !== null ? Math.round(fiber * 10) / 10 : null,
      sugarPer100g: sugar !== null ? Math.round(sugar * 10) / 10 : null,
      sodiumPer100g: sodiumG,
      dataType: food.dataType,
    };
  });
}
