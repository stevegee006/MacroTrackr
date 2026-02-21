import type { FastifyInstance } from 'fastify';
import { generateMealPlanSchema, updateMealPlanSchema } from '@macrotracker/shared';
import * as mealPlanService from '../../services/meal-plan.service.js';

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

  fastify.delete('/meal-plan/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await mealPlanService.deleteMealPlan(fastify, request.user.sub, id);
    reply.code(204).send();
  });
}
