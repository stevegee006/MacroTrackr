import type { FastifyInstance } from 'fastify';
import { createSsoProviderSchema, updateSsoProviderSchema, adminCreateUserSchema, appSettingsSchema, updateFoodItemSchema, adminListQuerySchema, ingestParseSchema, ingestImportSchema } from '@macrotracker/shared';
import * as adminService from '../../services/admin.service.js';
import * as ssoService from '../../services/sso.service.js';
import * as appConfigService from '../../services/app-config.service.js';
import * as foodIngestService from '../../services/food-ingest.service.js';
import { ForbiddenError } from '../../utils/errors.js';

export default async function adminRoutes(fastify: FastifyInstance) {
  // All admin routes require authentication + admin check
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }
  });

  // App settings
  fastify.get('/admin/settings', async () => {
    const settings = await appConfigService.getAppSettings(fastify);
    return { data: settings };
  });

  fastify.put('/admin/settings', async (request) => {
    const body = appSettingsSchema.parse(request.body);
    const settings = await appConfigService.updateAppSettings(fastify, body);
    return { data: settings };
  });

  // Create user (admin-only)
  fastify.post('/admin/users', async (request, reply) => {
    const body = adminCreateUserSchema.parse(request.body);
    const user = await adminService.createUser(fastify, body.email, body.password, body.displayName);
    reply.code(201).send({ data: user });
  });

  fastify.get('/admin/stats', async () => {
    const stats = await adminService.getStats(fastify);
    return { data: stats };
  });

  fastify.get('/admin/users', async (request) => {
    const { page, limit, q } = adminListQuerySchema.parse(request.query);
    return adminService.listUsers(fastify, page, limit, q);
  });

  fastify.delete('/admin/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await adminService.deleteUser(fastify, request.user.sub, id);
    reply.code(204).send();
  });

  // Password reset
  fastify.post('/admin/users/:id/reset-password', async (request) => {
    const { id } = request.params as { id: string };
    const result = await adminService.resetUserPassword(fastify, request.user.sub, id);
    return { data: result };
  });

  fastify.get('/admin/food-items', async (request) => {
    const { page, limit, q } = adminListQuerySchema.parse(request.query);
    return adminService.listFoodItems(fastify, page, limit, q);
  });

  fastify.patch('/admin/food-items/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = updateFoodItemSchema.parse(request.body);
    const item = await adminService.updateFoodItem(fastify, id, body);
    return { data: item };
  });

  fastify.delete('/admin/food-items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await adminService.deleteFoodItem(fastify, id);
    reply.code(204).send();
  });

  // AI Ingest — parse uploaded file into food items (no save)
  fastify.post('/admin/food-items/ingest/parse', {
    bodyLimit: 25 * 1024 * 1024, // 25MB for large PDFs
    handler: async (request) => {
      const body = ingestParseSchema.parse(request.body);
      let items;
      if (body.type === 'pdf') {
        items = await foodIngestService.parsePdfIngest(fastify, request.user.sub, body.data);
      } else if (body.type === 'images') {
        items = await foodIngestService.parseImagesIngest(fastify, request.user.sub, body.data);
      } else {
        items = await foodIngestService.parseCsvIngest(body.data);
      }
      return { data: items };
    },
  });

  // AI Ingest — bulk import the (possibly edited) parsed items
  fastify.post('/admin/food-items/ingest/import', async (request, reply) => {
    const body = ingestImportSchema.parse(request.body);
    const result = await foodIngestService.bulkImportFoods(fastify, body.items);
    reply.code(201).send({ data: result });
  });

  // SSO management routes
  fastify.get('/admin/sso', async () => {
    const providers = await ssoService.listSsoProviders(fastify);
    return { data: providers };
  });

  fastify.post('/admin/sso', async (request, reply) => {
    const body = createSsoProviderSchema.parse(request.body);
    const provider = await ssoService.createSsoProvider(fastify, body);
    reply.code(201).send({ data: provider });
  });

  fastify.get('/admin/sso/:id', async (request) => {
    const { id } = request.params as { id: string };
    const provider = await ssoService.getSsoProvider(fastify, id);
    return { data: provider };
  });

  fastify.patch('/admin/sso/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = updateSsoProviderSchema.parse(request.body);
    const provider = await ssoService.updateSsoProvider(fastify, id, body);
    return { data: provider };
  });

  fastify.delete('/admin/sso/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await ssoService.deleteSsoProvider(fastify, id);
    reply.code(204).send();
  });
}
