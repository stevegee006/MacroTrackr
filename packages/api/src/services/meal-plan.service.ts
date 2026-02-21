import type { FastifyInstance } from 'fastify';
import { mealPlanDataSchema, type GenerateMealPlanInput } from '@macrotracker/shared';
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

  const userPrompt = `Generate a ${input.durationDays}-day meal plan with the following daily targets:

- Calories: ${profile.targetCalories} kcal
- Protein: ${profile.targetProteinG}g
- Carbs: ${profile.targetCarbsG}g
- Fat: ${profile.targetFatG}g

Meals per day: ${prefs.mealsPerDay ?? 4}
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

export async function deleteMealPlan(fastify: FastifyInstance, userId: string, planId: string) {
  const plan = await getMealPlan(fastify, userId, planId);
  await fastify.prisma.mealPlan.delete({ where: { id: plan.id } });
}
