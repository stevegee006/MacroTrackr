import type { FastifyInstance } from 'fastify';
import {
  createFoodLogSchema,
  updateFoodLogSchema,
  foodLogQuerySchema,
  foodLogRangeSchema,
} from '@macrotracker/shared';
import * as foodLogService from '../../services/food-log.service.js';

export default async function foodLogRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/food-log', async (request) => {
    const { date } = foodLogQuerySchema.parse(request.query);
    const entries = await foodLogService.getLogByDate(fastify, request.user.sub, date);
    return { data: entries };
  });

  fastify.get('/food-log/summary', async (request) => {
    const { date } = foodLogQuerySchema.parse(request.query);
    const summary = await foodLogService.getDailySummary(fastify, request.user.sub, date);
    return { data: summary };
  });

  fastify.get('/food-log/range', async (request) => {
    const { from, to } = foodLogRangeSchema.parse(request.query);
    const range = await foodLogService.getLogRange(fastify, request.user.sub, from, to);
    return { data: range };
  });

  fastify.get('/food-log/frequent', async (request) => {
    const { mealType, days, limit } = (request.query as { mealType?: string; days?: string; limit?: string });
    const mt = mealType || 'BREAKFAST';
    const d = days ? parseInt(days) : 30;
    const l = limit ? parseInt(limit) : 10;
    const data = await foodLogService.getFrequentFoods(fastify, request.user.sub, mt, d, l);
    return { data };
  });

  fastify.get('/food-log/export', async (request) => {
    const { from, to } = foodLogRangeSchema.parse(request.query);
    const entries = await foodLogService.getLogEntriesForExport(fastify, request.user.sub, from, to);
    return { data: entries };
  });

  fastify.post('/food-log', async (request, reply) => {
    const body = createFoodLogSchema.parse(request.body);
    const entry = await foodLogService.createLogEntry(fastify, request.user.sub, body);
    reply.code(201).send({ data: entry });
  });

  fastify.patch('/food-log/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = updateFoodLogSchema.parse(request.body);
    const entry = await foodLogService.updateLogEntry(fastify, request.user.sub, id, body);
    return { data: entry };
  });

  fastify.delete('/food-log/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await foodLogService.deleteLogEntry(fastify, request.user.sub, id);
    reply.code(204).send();
  });
}
