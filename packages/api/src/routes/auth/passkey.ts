import type { FastifyInstance } from 'fastify';
import * as passkeyService from '../../services/passkey.service.js';
import * as authService from '../../services/auth.service.js';

const authRateLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

export default async function passkeyRoutes(fastify: FastifyInstance) {
  // ── Registration (authenticated users adding a passkey) ──

  fastify.post('/auth/passkey/register/options', async (request, reply) => {
    await fastify.authenticate(request, reply);
    const options = await passkeyService.generateRegOptions(fastify, request.user.sub);
    reply.send({ data: options });
  });

  fastify.post('/auth/passkey/register/verify', async (request, reply) => {
    await fastify.authenticate(request, reply);
    const { response, friendlyName } = request.body as {
      response: any;
      friendlyName?: string;
    };
    const result = await passkeyService.verifyRegistration(
      fastify,
      request.user.sub,
      response,
      friendlyName,
    );
    reply.send({ data: result });
  });

  // ── Authentication (login with passkey) ──

  fastify.post('/auth/passkey/authenticate/options', { ...authRateLimit }, async (request, reply) => {
    const { email } = (request.body as { email?: string }) || {};
    const options = await passkeyService.generateAuthOptions(fastify, email);
    reply.send({ data: options });
  });

  fastify.post('/auth/passkey/authenticate/verify', { ...authRateLimit }, async (request, reply) => {
    const { response, challenge } = request.body as {
      response: any;
      challenge: string;
    };
    const user = await passkeyService.verifyAuthentication(fastify, response, challenge);
    const tokens = await authService.generateTokensForPasskey(fastify, user.id, user.email, user.isAdmin);
    reply.send({ data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
  });

  // ── Management (list / delete passkeys) ──

  fastify.get('/auth/passkey/list', async (request, reply) => {
    await fastify.authenticate(request, reply);
    const passkeys = await passkeyService.listPasskeys(fastify, request.user.sub);
    reply.send({ data: passkeys });
  });

  fastify.delete('/auth/passkey/:id', async (request, reply) => {
    await fastify.authenticate(request, reply);
    const { id } = request.params as { id: string };
    await passkeyService.deletePasskey(fastify, request.user.sub, id);
    reply.send({ data: { success: true } });
  });
}
