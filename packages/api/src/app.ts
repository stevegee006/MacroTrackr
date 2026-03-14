import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { corsOptions } from './config/cors.js';
import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth/index.js';
import userRoutes from './routes/users/index.js';
import foodRoutes from './routes/food/index.js';
import foodLogRoutes from './routes/food-log/index.js';
import macroPlanRoutes from './routes/macro-plan/index.js';
import mealPlanRoutes from './routes/meal-plan/index.js';
import adminRoutes from './routes/admin/index.js';
import oauthRoutes from './routes/auth/oauth.js';
import ssoRoutes from './routes/auth/sso.js';
import { AppError } from './utils/errors.js';
import { logger } from './utils/logger.js';

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
  });

  // Plugins
  await app.register(cors, corsOptions);
  await app.register(cookie);
  await app.register(helmet, { contentSecurityPolicy: false }); // CSP managed by Next.js
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  });
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
    }

    if (error instanceof ZodError) {
      return reply.code(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.flatten().fieldErrors,
        },
      });
    }

    request.log.error(error);
    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });

  // Health checks
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/health/ready', async () => {
    await app.prisma.$queryRaw`SELECT 1`;
    await app.redis.ping();
    return { status: 'ready' };
  });

  // API routes (prefixed)
  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(oauthRoutes);
      await api.register(ssoRoutes);
      await api.register(userRoutes);
      await api.register(foodRoutes);
      await api.register(foodLogRoutes);
      await api.register(macroPlanRoutes);
      await api.register(mealPlanRoutes);
      await api.register(adminRoutes);
    },
    { prefix: '/api/v1' },
  );

  return app;
}
