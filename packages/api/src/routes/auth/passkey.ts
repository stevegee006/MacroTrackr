import type { FastifyInstance } from 'fastify';
import * as passkeyService from '../../services/passkey.service.js';
import * as authService from '../../services/auth.service.js';
import { env } from '../../config/env.js';

const authRateLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

/**
 * Extract the client origin from the request's Origin or Referer header,
 * falling back to FRONTEND_URL. This ensures the rpID matches how the
 * user actually accessed the app (IP, domain, localhost, etc.)
 */
function getClientOrigin(request: { headers: Record<string, string | string[] | undefined> }): string {
  const origin = request.headers['origin'];
  if (origin && typeof origin === 'string') return origin;

  const referer = request.headers['referer'];
  if (referer && typeof referer === 'string') {
    try {
      const url = new URL(referer);
      return url.origin;
    } catch { /* ignore */ }
  }

  return env.FRONTEND_URL;
}

export default async function passkeyRoutes(fastify: FastifyInstance) {
  // ── Registration (authenticated users adding a passkey) ──

  fastify.post('/auth/passkey/register/options', async (request, reply) => {
    await fastify.authenticate(request, reply);
    const clientOrigin = getClientOrigin(request);
    const options = await passkeyService.generateRegOptions(fastify, request.user.sub, clientOrigin);
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
    const clientOrigin = getClientOrigin(request);
    const options = await passkeyService.generateAuthOptions(fastify, clientOrigin, email);
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
