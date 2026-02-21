import type { FastifyInstance } from 'fastify';
import { mealPlanDataSchema, type GenerateMealPlanInput, type UpdateMealPlanInput } from '@macrotracker/shared';
import { getOpenAIClient, chatCompletion } from './openai.service.js';
import { getProfile } from './user.service.js';
import { ValidationError, NotFoundError, ForbiddenError, AppError } from '../utils/errors.js';

const SYSTEM_PROMPT = `You are an expert meal planning AI assistant. Your role is to generate detailed, practical meal plans that hit specific macro nutrient targets.

Guidelines:
1. Each meal must include: name, list of ingredients with approximate quantities in grams, estimated macros (calories, protein, carbs, fat), and prep time in minutes.
2. Daily totals must be within 5% of the target macros.
3. Meals should be practical and use commonly available ingredients.
4. Respect all dietary restrictions provided.
5. Vary meals across days - minimize repetition.
6. Include a mix of simple and moderately complex recipes.
7. Adjust portion sizes to hit the macro targets precisely.
8. For each ingredient, provide weight in grams.
9. CRITICAL: You MUST generate EXACTLY the number of meals per day specified. If the user says 4 meals per day, every single day MUST have exactly 4 meals (e.g. Breakfast, Lunch, Dinner, Snack). Do NOT add or remove meals.

Respond ONLY with valid JSON matching the provided schema.`;

export async function generateMealPlan(
  fastify: FastifyInstance,
  userId: string,
  input: GenerateMealPlanInput,
) {
  const profile = await getProfile(fastify, userId);

  if (!profile.targetCalories || !profile.targetProteinG || !profile.targetCarbsG || !profile.targetFatG) {
    throw new ValidationError(
      'Please set your macro targets (or generate and activate a macro plan) before generating a meal plan.',
    );
  }

  const client = await getOpenAIClient(fastify, userId);
  const prefs = input.preferences ?? {};

  const mealsPerDay = prefs.mealsPerDay ?? 4;

  const userPrompt = `Generate a ${input.durationDays}-day meal plan with the following daily targets:

- Calories: ${profile.targetCalories} kcal
- Protein: ${profile.targetProteinG}g
- Carbs: ${profile.targetCarbsG}g
- Fat: ${profile.targetFatG}g

IMPORTANT: Each day MUST have EXACTLY ${mealsPerDay} meals. ${mealsPerDay === 4 ? 'Use meal types: BREAKFAST, LUNCH, DINNER, SNACK.' : mealsPerDay === 3 ? 'Use meal types: BREAKFAST, LUNCH, DINNER.' : `Use ${mealsPerDay} meals with appropriate meal types (BREAKFAST, LUNCH, DINNER, SNACK).`}
${prefs.dietaryRestrictions?.length ? `Dietary restrictions: ${prefs.dietaryRestrictions.join(', ')}` : ''}
${prefs.cuisinePreferences?.length ? `Cuisine preferences: ${prefs.cuisinePreferences.join(', ')}` : ''}
${prefs.cookingSkill ? `Cooking skill: ${prefs.cookingSkill}` : ''}
${prefs.maxPrepTimeMinutes ? `Max prep time per meal: ${prefs.maxPrepTimeMinutes} minutes` : ''}

Provide your response as JSON with this structure:
{
  "days": [
    {
      "dayNumber": 1,
      "meals": [
        {
          "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
          "name": "Meal name",
          "ingredients": [
            { "name": "ingredient", "quantityG": 100, "notes": "optional" }
          ],
          "macros": {
            "calories": 500,
            "proteinG": 35,
            "carbsG": 50,
            "fatG": 15
          },
          "prepTimeMinutes": 20,
          "instructions": "Brief cooking instructions"
        }
      ],
      "dayTotals": {
        "calories": 2200,
        "proteinG": 180,
        "carbsG": 250,
        "fatG": 70
      }
    }
  ]
}`;

  const result = await chatCompletion(client, SYSTEM_PROMPT, userPrompt, {
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 16000,
  });

  const parsed = mealPlanDataSchema.safeParse(JSON.parse(result.content));
  if (!parsed.success) {
    throw new AppError(502, 'AI_PARSE_ERROR', 'Failed to parse AI meal plan response. Please try again.');
  }

  const plan = await fastify.prisma.mealPlan.create({
    data: {
      userId,
      name: `${input.durationDays}-Day Meal Plan`,
      durationDays: input.durationDays,
      targetCalories: profile.targetCalories,
      targetProteinG: profile.targetProteinG,
      targetCarbsG: profile.targetCarbsG,
      targetFatG: profile.targetFatG,
      planData: parsed.data as any,
      preferences: input.preferences as any ?? null,
      aiModel: result.model,
    },
  });

  return plan;
}

export async function listMealPlans(fastify: FastifyInstance, userId: string) {
  return fastify.prisma.mealPlan.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMealPlan(fastify: FastifyInstance, userId: string, planId: string) {
  const plan = await fastify.prisma.mealPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Meal plan');
  if (plan.userId !== userId) throw new ForbiddenError();
  return plan;
}

export async function updateMealPlan(
  fastify: FastifyInstance,
  userId: string,
  planId: string,
  input: UpdateMealPlanInput,
) {
  const plan = await getMealPlan(fastify, userId, planId);

  return fastify.prisma.mealPlan.update({
    where: { id: plan.id },
    data: {
      name: input.name ?? plan.name,
      targetCalories: input.targetCalories ?? plan.targetCalories,
      targetProteinG: input.targetProteinG ?? plan.targetProteinG,
      targetCarbsG: input.targetCarbsG ?? plan.targetCarbsG,
      targetFatG: input.targetFatG ?? plan.targetFatG,
    },
  });
}

export async function regenerateMeal(
  fastify: FastifyInstance,
  userId: string,
  planId: string,
  dayNumber: number,
  mealIndex: number,
) {
  const plan = await getMealPlan(fastify, userId, planId);
  const planData = plan.planData as any;

  const day = planData.days?.find((d: any) => d.dayNumber === dayNumber);
  if (!day) throw new NotFoundError('Day');
  if (mealIndex < 0 || mealIndex >= day.meals.length) throw new NotFoundError('Meal');

  const oldMeal = day.meals[mealIndex];
  const otherMeals = day.meals.filter((_: any, i: number) => i !== mealIndex);
  const otherMealNames = otherMeals.map((m: any) => m.name);

  const profile = await getProfile(fastify, userId);
  const client = await getOpenAIClient(fastify, userId);

  const prefs = plan.preferences as any ?? {};

  const userPrompt = `I need you to regenerate a SINGLE replacement meal for a meal plan.

The meal to replace is: "${oldMeal.name}" (${oldMeal.mealType}, Day ${dayNumber})

Daily macro targets:
- Calories: ${plan.targetCalories} kcal
- Protein: ${plan.targetProteinG}g
- Carbs: ${plan.targetCarbsG}g
- Fat: ${plan.targetFatG}g

The replacement meal should have APPROXIMATELY these macros (matching the meal it replaces):
- Calories: ~${oldMeal.macros.calories} kcal
- Protein: ~${oldMeal.macros.proteinG}g
- Carbs: ~${oldMeal.macros.carbsG}g
- Fat: ~${oldMeal.macros.fatG}g

Meal type: ${oldMeal.mealType}
${prefs.dietaryRestrictions?.length ? `Dietary restrictions: ${prefs.dietaryRestrictions.join(', ')}` : ''}
${prefs.cuisinePreferences?.length ? `Cuisine preferences: ${prefs.cuisinePreferences.join(', ')}` : ''}

IMPORTANT: Generate a DIFFERENT meal than "${oldMeal.name}". Also avoid these meals already in this day: ${otherMealNames.join(', ')}.

Respond with a single meal object as JSON:
{
  "mealType": "${oldMeal.mealType}",
  "name": "New meal name",
  "ingredients": [{ "name": "ingredient", "quantityG": 100, "notes": "optional" }],
  "macros": { "calories": 500, "proteinG": 35, "carbsG": 50, "fatG": 15 },
  "prepTimeMinutes": 20,
  "instructions": "Brief cooking instructions"
}`;

  const result = await chatCompletion(client, SYSTEM_PROMPT, userPrompt, {
    model: 'gpt-4o',
    temperature: 0.9,
    maxTokens: 2000,
  });

  const newMeal = JSON.parse(result.content);

  // Validate the new meal has required fields
  if (!newMeal.mealType || !newMeal.name || !newMeal.ingredients || !newMeal.macros) {
    throw new AppError(502, 'AI_PARSE_ERROR', 'Failed to parse AI meal response. Please try again.');
  }

  // Replace the meal in the plan data
  day.meals[mealIndex] = newMeal;

  // Recalculate day totals
  day.dayTotals = {
    calories: day.meals.reduce((sum: number, m: any) => sum + (m.macros.calories ?? 0), 0),
    proteinG: day.meals.reduce((sum: number, m: any) => sum + (m.macros.proteinG ?? 0), 0),
    carbsG: day.meals.reduce((sum: number, m: any) => sum + (m.macros.carbsG ?? 0), 0),
    fatG: day.meals.reduce((sum: number, m: any) => sum + (m.macros.fatG ?? 0), 0),
  };

  const updated = await fastify.prisma.mealPlan.update({
    where: { id: plan.id },
    data: { planData: planData },
  });

  return updated;
}

export async function deleteMealPlan(fastify: FastifyInstance, userId: string, planId: string) {
  const plan = await getMealPlan(fastify, userId, planId);
  await fastify.prisma.mealPlan.delete({ where: { id: plan.id } });
}
