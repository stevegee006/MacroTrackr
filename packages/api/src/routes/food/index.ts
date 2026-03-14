import type { FastifyInstance } from 'fastify';
import { createFoodItemSchema, updateFoodItemSchema, searchFoodSchema, scanLabelSchema, estimateFoodSchema, externalFoodSearchSchema, importUsdaFoodSchema } from '@macrotracker/shared';
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

  // External search (USDA FoodData Central) — MUST be before /food/:id catch-all
  fastify.get('/food/search/external', async (request) => {
    const query = externalFoodSearchSchema.parse(request.query);
    const results = await foodService.searchExternalFoods(fastify, query.q, query.limit);
    return { data: results };
  });

  // Import a USDA food into local DB
  fastify.post('/food/import/usda', async (request, reply) => {
    const body = importUsdaFoodSchema.parse(request.body);
    const item = await foodService.importUsdaFood(fastify, body);
    reply.code(201).send({ data: item });
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

  fastify.post('/food/scan-label', {
    bodyLimit: 10 * 1024 * 1024, // 10MB for base64 images
    handler: async (request, reply) => {
      const body = scanLabelSchema.parse(request.body);
      const item = await foodService.extractNutritionFromLabel(
        fastify,
        request.user.sub,
        body.image,
      );
      reply.code(201).send({ data: item });
    },
  });

  fastify.post('/food/:id/scan-label', {
    bodyLimit: 10 * 1024 * 1024, // 10MB for base64 images
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = scanLabelSchema.parse(request.body);
      const item = await foodService.updateFoodFromLabel(
        fastify,
        request.user.sub,
        id,
        body.image,
      );
      return { data: item };
    },
  });

  fastify.post('/food/estimate', async (request, reply) => {
    const body = estimateFoodSchema.parse(request.body);
    const item = await foodService.estimateFoodMacros(
      fastify,
      request.user.sub,
      body.description,
      body.weightG,
    );
    reply.code(201).send({ data: item });
  });
}
