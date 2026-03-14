import type { FastifyInstance } from 'fastify';
import { decrypt } from '../utils/encryption.js';
import { ValidationError, AppError } from '../utils/errors.js';

interface MealieConfig {
  baseUrl: string;
  apiKey: string;
}

function validateMealieUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError('Invalid Mealie URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError('Mealie URL must use http or https.');
  }
  const hostname = parsed.hostname.toLowerCase();
  // Block internal/metadata IPs
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('169.254.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    hostname === 'metadata.google.internal'
  ) {
    throw new ValidationError('Mealie URL cannot point to internal or private network addresses.');
  }
}

async function getMealieConfig(fastify: FastifyInstance, userId: string): Promise<MealieConfig> {
  const settings = await fastify.prisma.userSettings.findUnique({ where: { userId } });
  if (!settings?.mealieUrl || !settings?.mealieApiKey) {
    throw new ValidationError('Mealie is not configured. Please add your Mealie URL and API key in Settings.');
  }

  validateMealieUrl(settings.mealieUrl);

  const apiKey = decrypt(settings.mealieApiKey);
  // Ensure base URL has no trailing slash
  const baseUrl = settings.mealieUrl.replace(/\/+$/, '');

  return { baseUrl, apiKey };
}

async function mealieFetch(config: MealieConfig, path: string): Promise<any> {
  const url = `${config.baseUrl}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => 'Unknown error');
    throw new AppError(
      res.status === 401 ? 401 : 502,
      res.status === 401 ? 'MEALIE_AUTH_ERROR' : 'MEALIE_ERROR',
      res.status === 401
        ? 'Mealie authentication failed. Check your API key.'
        : `Mealie request failed: ${res.status} ${body}`,
    );
  }

  return res.json();
}

export async function searchMealieRecipes(
  fastify: FastifyInstance,
  userId: string,
  query: string,
) {
  const config = await getMealieConfig(fastify, userId);
  const encoded = encodeURIComponent(query);
  const data = await mealieFetch(config, `/api/recipes?search=${encoded}&perPage=20`);
  // Mealie v1 returns { items: [...], total, ... }
  return data.items ?? data;
}

export async function getMealieRecipe(
  fastify: FastifyInstance,
  userId: string,
  slug: string,
) {
  const config = await getMealieConfig(fastify, userId);
  return mealieFetch(config, `/api/recipes/${encodeURIComponent(slug)}`);
}

/**
 * Parse ISO 8601 duration (e.g. PT30M, PT1H30M) to minutes
 */
function parseIsoDuration(duration: string | null | undefined): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours * 60 + minutes;
}

export function mealieRecipeToMeal(recipe: any, mealType: string) {
  const ingredients = (recipe.recipeIngredient ?? []).map((ing: any) => ({
    name: ing.note ?? ing.display ?? ing.food?.name ?? 'Unknown ingredient',
    quantityG: ing.quantity ?? 100,
    notes: ing.unit?.name ? `${ing.quantity ?? ''} ${ing.unit.name}`.trim() : undefined,
  }));

  const nutrition = recipe.nutrition ?? {};
  const macros = {
    calories: parseFloat(nutrition.calories) || 0,
    proteinG: parseFloat(nutrition.proteinContent) || 0,
    carbsG: parseFloat(nutrition.carbohydrateContent) || 0,
    fatG: parseFloat(nutrition.fatContent) || 0,
  };

  const instructions = (recipe.recipeInstructions ?? [])
    .map((step: any, i: number) => `${i + 1}. ${step.text}`)
    .join('\n');

  const prepTime =
    parseIsoDuration(recipe.prepTime) +
    parseIsoDuration(recipe.performTime ?? recipe.cookTime);

  return {
    mealType: mealType || 'DINNER',
    name: recipe.name ?? 'Imported Recipe',
    ingredients,
    macros,
    prepTimeMinutes: prepTime || 30,
    instructions: instructions || 'See original recipe for instructions.',
  };
}
