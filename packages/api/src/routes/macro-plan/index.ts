import type { FastifyInstance } from 'fastify';
import { generateMacroPlanSchema } from '@macrotracker/shared';
import * as macroPlanService from '../../services/macro-plan.service.js';

export default async function macroPlanRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/macro-plan/generate', async (request, reply) => {
    const body = generateMacroPlanSchema.parse(request.body);
    const plan = await macroPlanService.generateMacroPlan(fastify, request.user.sub, body);
    reply.code(201).send({ data: plan });
  });

  fastify.get('/macro-plan', async (request) => {
    const plans = await macroPlanService.listMacroPlans(fastify, request.user.sub);
    return { data: plans };
  });

  fastify.get('/macro-plan/:id', async (request) => {
    const { id } = request.params as { id: string };
    const plan = await macroPlanService.getMacroPlan(fastify, request.user.sub, id);
    return { data: plan };
  });

  fastify.post('/macro-plan/:id/activate', async (request) => {
    const { id } = request.params as { id: string };
    const plan = await macroPlanService.activateMacroPlan(fastify, request.user.sub, id);
    return { data: plan };
  });

  fastify.delete('/macro-plan/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await macroPlanService.deleteMacroPlan(fastify, request.user.sub, id);
    reply.code(204).send();
  });
}
