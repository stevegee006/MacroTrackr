import type { FastifyInstance } from 'fastify';
import * as adminService from '../../services/admin.service.js';
import { ForbiddenError } from '../../utils/errors.js';

export default async function adminRoutes(fastify: FastifyInstance) {
  // All admin routes require authentication + admin check
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }
  });

  fastify.get('/admin/stats', async () => {
    const stats = await adminService.getStats(fastify);
    return { data: stats };
  });

  fastify.get('/admin/users', async (request) => {
    const { page = 1, limit = 20, q } = request.query as { page?: number; limit?: number; q?: string };
    return adminService.listUsers(fastify, Number(page), Number(limit), q);
  });

  fastify.delete('/admin/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await adminService.deleteUser(fastify, request.user.sub, id);
    reply.code(204).send();
  });

  fastify.get('/admin/food-items', async (request) => {
    const { page = 1, limit = 20, q } = request.query as { page?: number; limit?: number; q?: string };
    return adminService.listFoodItems(fastify, Number(page), Number(limit), q);
  });

  fastify.delete('/admin/food-items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await adminService.deleteFoodItem(fastify, id);
    reply.code(204).send();
  });
}
