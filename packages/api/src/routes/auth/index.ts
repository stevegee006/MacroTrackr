import type { FastifyInstance } from 'fastify';
import { loginSchema, registerSchema } from '@macrotracker/shared';
import * as authService from '../../services/auth.service.js';
import { AppError } from '../../utils/errors.js';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const tokens = await authService.registerUser(fastify, body.email, body.password, body.displayName);
    reply
      .setCookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60,
      })
      .send({ data: { accessToken: tokens.accessToken } });
  });

  fastify.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const tokens = await authService.loginUser(fastify, body.email, body.password);
    reply
      .setCookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60,
      })
      .send({ data: { accessToken: tokens.accessToken } });
  });

  fastify.post('/auth/refresh', async (request, reply) => {
    const refreshToken = (request.cookies as any)?.refreshToken;
    if (!refreshToken) {
      throw new AppError(401, 'UNAUTHORIZED', 'No refresh token provided');
    }
    const tokens = await authService.refreshTokens(fastify, refreshToken);
    reply
      .setCookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60,
      })
      .send({ data: { accessToken: tokens.accessToken } });
  });

  fastify.post('/auth/logout', async (request, reply) => {
    const refreshToken = (request.cookies as any)?.refreshToken;
    if (refreshToken) {
      await authService.logoutUser(fastify, refreshToken);
    }
    reply.clearCookie('refreshToken', { path: '/api/v1/auth' }).send({ data: { success: true } });
  });
}
