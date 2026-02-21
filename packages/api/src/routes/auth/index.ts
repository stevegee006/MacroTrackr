import type { FastifyInstance } from 'fastify';
import { loginSchema, registerSchema } from '@macrotracker/shared';
import * as authService from '../../services/auth.service.js';
import { AppError } from '../../utils/errors.js';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const tokens = await authService.registerUser(fastify, body.email, body.password, body.displayName);
    reply.send({ data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
  });

  fastify.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const tokens = await authService.loginUser(fastify, body.email, body.password);
    reply.send({ data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
  });

  fastify.post('/auth/refresh', async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    const refreshToken = body?.refreshToken;
    if (!refreshToken) {
      throw new AppError(401, 'UNAUTHORIZED', 'No refresh token provided');
    }
    const tokens = await authService.refreshTokens(fastify, refreshToken);
    reply.send({ data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
  });

  fastify.post('/auth/logout', async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    const refreshToken = body?.refreshToken;
    if (refreshToken) {
      await authService.logoutUser(fastify, refreshToken);
    }
    reply.send({ data: { success: true } });
  });
}
