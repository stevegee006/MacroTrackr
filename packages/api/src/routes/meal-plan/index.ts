import type { FastifyInstance } from 'fastify';
import { generateMealPlanSchema, updateMealPlanSchema, createManualMealPlanSchema, mealPlanDataSchema, regenerateMealSchema, convertRecipeSchema } from '@macrotracker/shared';
import * as mealPlanService from '../../services/meal-plan.service.js';
import * as mealieService from '../../services/mealie.service.js';

export default async function mealPlanRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/meal-plan/generate', async (request, reply) => {
    const body = generateMealPlanSchema.parse(request.body);
    const plan = await mealPlanService.generateMealPlan(fastify, request.user.sub, body);
    reply.code(201).send({ data: plan });
  });

  fastify.get('/meal-plan', async (request) => {
    const plans = await mealPlanService.listMealPlans(fastify, request.user.sub);
    return { data: plans };
  });

  fastify.get('/meal-plan/:id', async (request) => {
    const { id } = request.params as { id: string };
    const plan = await mealPlanService.getMealPlan(fastify, request.user.sub, id);
    return { data: plan };
  });

  fastify.patch('/meal-plan/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = updateMealPlanSchema.parse(request.body);
    const plan = await mealPlanService.updateMealPlan(fastify, request.user.sub, id, body);
    return { data: plan };
  });

  // Manual creation
  fastify.post('/meal-plan', async (request, reply) => {
    const body = createManualMealPlanSchema.parse(request.body);
    const plan = await mealPlanService.createManualMealPlan(fastify, request.user.sub, body);
    reply.code(201).send({ data: plan });
  });

  // Update plan data
  fastify.put('/meal-plan/:id/data', async (request) => {
    const { id } = request.params as { id: string };
    const body = mealPlanDataSchema.parse(request.body);
    const plan = await mealPlanService.updateMealPlanData(fastify, request.user.sub, id, body);
    return { data: plan };
  });

  // Mealie integration
  fastify.get('/mealie/recipes', async (request) => {
    const { q } = request.query as { q?: string };
    const recipes = await mealieService.searchMealieRecipes(fastify, request.user.sub, q ?? '');
    return { data: recipes };
  });

  fastify.get('/mealie/recipes/:slug', async (request) => {
    const { slug } = request.params as { slug: string };
    const recipe = await mealieService.getMealieRecipe(fastify, request.user.sub, slug);
    return { data: recipe };
  });

  fastify.post('/mealie/recipes/:slug/convert', async (request) => {
    const { slug } = request.params as { slug: string };
    const { mealType } = convertRecipeSchema.parse(request.body);
    const recipe = await mealieService.getMealieRecipe(fastify, request.user.sub, slug);
    const meal = mealieService.mealieRecipeToMeal(recipe, mealType);
    return { data: meal };
  });

  fastify.post('/meal-plan/:id/regenerate-meal', async (request) => {
    const { id } = request.params as { id: string };
    const { dayNumber, mealIndex } = regenerateMealSchema.parse(request.body);
    const plan = await mealPlanService.regenerateMeal(fastify, request.user.sub, id, dayNumber, mealIndex);
    return { data: plan };
  });

  fastify.delete('/meal-plan/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await mealPlanService.deleteMealPlan(fastify, request.user.sub, id);
    reply.code(204).send();
  });
}
