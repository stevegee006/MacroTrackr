import type { FastifyInstance } from 'fastify';
import { createFoodItemSchema, updateFoodItemSchema, searchFoodSchema } from '@macrotracker/shared';
import * as foodService from '../../services/food.service.js';

export default async function foodRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/food/barcode/:barcode', async (request) => {
    const { barcode } = request.params as { barcode: string };
    const item = await foodService.getFoodByBarcode(fastify, barcode);
    return { data: item };
  });

  fastify.get('/food/search', async (request) => {
    const query = searchFoodSchema.parse(request.query);
    const result = await foodService.searchFood(fastify, query.q, query.page, query.limit);
    return result;
  });

  fastify.get('/food/:id', async (request) => {
    const { id } = request.params as { id: string };
    const item = await foodService.getFoodById(fastify, id);
    return { data: item };
  });

  fastify.post('/food', async (request, reply) => {
    const body = createFoodItemSchema.parse(request.body);
    const item = await foodService.createFoodItem(fastify, body);
    reply.code(201).send({ data: item });
  });

  fastify.patch('/food/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = updateFoodItemSchema.parse(request.body);
    const item = await foodService.updateFoodItem(fastify, id, body);
    return { data: item };
  });
}
