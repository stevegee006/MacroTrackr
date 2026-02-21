import type { FastifyInstance } from 'fastify';
import { macroPlanResponseSchema, type GenerateMacroPlanInput, type UpdateMacroPlanInput } from '@macrotracker/shared';
import { getOpenAIClient, chatCompletion } from './openai.service.js';
import { getProfile } from './user.service.js';
import { ValidationError, NotFoundError, ForbiddenError, AppError } from '../utils/errors.js';

const SYSTEM_PROMPT = `You are a certified sports nutritionist AI assistant. Your role is to generate personalized daily macro nutrient targets based on the user's physical stats, activity level, and goals.

Use the Mifflin-St Jeor equation for BMR calculation:
- Male: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
- Female: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161

Apply activity multipliers for TDEE:
- Sedentary: BMR * 1.2
- Lightly Active: BMR * 1.375
- Moderately Active: BMR * 1.55
- Very Active: BMR * 1.725
- Extremely Active: BMR * 1.9

For goals, adjust TDEE:
- Weight Loss: TDEE - 500 (moderate deficit)
- Maintenance: TDEE
- Muscle Gain: TDEE + 300 (lean bulk surplus)

For macro splits, use evidence-based ranges:
- Protein: 1.6-2.2g per kg bodyweight (higher end for cutting, lower for bulking)
- Fat: 0.8-1.2g per kg bodyweight (minimum 20% of calories)
- Carbs: Remaining calories after protein and fat

Always show your calculations step by step in the reasoning field.
Round calories to nearest 50, and grams to nearest 5.

Respond ONLY with valid JSON matching the provided schema.`;

export async function generateMacroPlan(
  fastify: FastifyInstance,
  userId: string,
  input: GenerateMacroPlanInput,
) {
  const profile = await getProfile(fastify, userId);

  if (!profile.heightCm || !profile.weightKg || !profile.age || !profile.sex || !profile.activityLevel) {
    throw new ValidationError(
      'Please complete your profile (height, weight, age, sex, activity level) before generating a macro plan.',
    );
  }

  const client = await getOpenAIClient(fastify, userId);

  const userPrompt = `Generate a macro plan for the following user:

- Height: ${profile.heightCm} cm
- Weight: ${profile.weightKg} kg
- Age: ${profile.age} years
- Sex: ${profile.sex}
- Activity Level: ${profile.activityLevel}
- Goal: ${input.goal}
${input.customNotes ? `- Additional preferences: ${input.customNotes}` : ''}

Provide your response as JSON with this structure:
{
  "targetCalories": <number>,
  "targetProteinG": <number>,
  "targetCarbsG": <number>,
  "targetFatG": <number>,
  "reasoning": "<step-by-step explanation of calculations>"
}`;

  const result = await chatCompletion(client, SYSTEM_PROMPT, userPrompt, {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1000,
  });

  const parsed = macroPlanResponseSchema.safeParse(JSON.parse(result.content));
  if (!parsed.success) {
    throw new AppError(502, 'AI_PARSE_ERROR', 'Failed to parse AI response. Please try again.');
  }

  const plan = await fastify.prisma.macroPlan.create({
    data: {
      userId,
      name: `${input.goal.replace('_', ' ')} Plan`,
      goal: input.goal,
      targetCalories: parsed.data.targetCalories,
      targetProteinG: parsed.data.targetProteinG,
      targetCarbsG: parsed.data.targetCarbsG,
      targetFatG: parsed.data.targetFatG,
      reasoning: parsed.data.reasoning,
      inputSnapshot: {
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        age: profile.age,
        sex: profile.sex,
        activityLevel: profile.activityLevel,
        customNotes: input.customNotes,
      },
      aiModel: result.model,
    },
  });

  return plan;
}

export async function listMacroPlans(fastify: FastifyInstance, userId: string) {
  return fastify.prisma.macroPlan.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMacroPlan(fastify: FastifyInstance, userId: string, planId: string) {
  const plan = await fastify.prisma.macroPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Macro plan');
  if (plan.userId !== userId) throw new ForbiddenError();
  return plan;
}

export async function activateMacroPlan(
  fastify: FastifyInstance,
  userId: string,
  planId: string,
) {
  const plan = await getMacroPlan(fastify, userId, planId);

  // Deactivate all other plans
  await fastify.prisma.macroPlan.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });

  // Activate this plan
  await fastify.prisma.macroPlan.update({
    where: { id: planId },
    data: { isActive: true },
  });

  // Copy targets to user profile
  await fastify.prisma.userProfile.update({
    where: { userId },
    data: {
      goal: plan.goal,
      targetCalories: plan.targetCalories,
      targetProteinG: plan.targetProteinG,
      targetCarbsG: plan.targetCarbsG,
      targetFatG: plan.targetFatG,
    },
  });

  return { ...plan, isActive: true };
}

export async function createManualMacroPlan(
  fastify: FastifyInstance,
  userId: string,
  input: { name: string; goal: string; targetCalories: number; targetProteinG: number; targetCarbsG: number; targetFatG: number },
) {
  return fastify.prisma.macroPlan.create({
    data: {
      userId,
      name: input.name,
      goal: input.goal as any,
      targetCalories: input.targetCalories,
      targetProteinG: input.targetProteinG,
      targetCarbsG: input.targetCarbsG,
      targetFatG: input.targetFatG,
      reasoning: 'Manually created plan',
      inputSnapshot: {},
      aiModel: 'manual',
      isActive: false,
    },
  });
}

export async function updateMacroPlan(
  fastify: FastifyInstance,
  userId: string,
  planId: string,
  input: UpdateMacroPlanInput,
) {
  const plan = await getMacroPlan(fastify, userId, planId);

  const updated = await fastify.prisma.macroPlan.update({
    where: { id: plan.id },
    data: {
      name: input.name ?? plan.name,
      goal: (input.goal as any) ?? plan.goal,
      targetCalories: input.targetCalories ?? plan.targetCalories,
      targetProteinG: input.targetProteinG ?? plan.targetProteinG,
      targetCarbsG: input.targetCarbsG ?? plan.targetCarbsG,
      targetFatG: input.targetFatG ?? plan.targetFatG,
    },
  });

  // If this plan is active, also sync targets to user profile
  if (updated.isActive) {
    await fastify.prisma.userProfile.update({
      where: { userId },
      data: {
        goal: updated.goal,
        targetCalories: updated.targetCalories,
        targetProteinG: updated.targetProteinG,
        targetCarbsG: updated.targetCarbsG,
        targetFatG: updated.targetFatG,
      },
    });
  }

  return updated;
}

export async function deleteMacroPlan(fastify: FastifyInstance, userId: string, planId: string) {
  const plan = await getMacroPlan(fastify, userId, planId);
  await fastify.prisma.macroPlan.delete({ where: { id: plan.id } });
}
