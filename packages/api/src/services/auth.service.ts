import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';
import { env } from '../config/env.js';

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export async function registerUser(
  fastify: FastifyInstance,
  email: string,
  password: string,
  displayName?: string,
) {
  const existing = await fastify.prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await fastify.prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName ?? null,
      authProvider: 'LOCAL',
      profile: { create: {} },
      settings: { create: {} },
    },
    select: { id: true, email: true, displayName: true },
  });

  return generateTokens(fastify, user.id, user.email);
}

export async function loginUser(fastify: FastifyInstance, email: string, password: string) {
  const user = await fastify.prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, authProvider: true },
  });

  if (!user || user.authProvider !== 'LOCAL' || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return generateTokens(fastify, user.id, user.email);
}

export async function refreshTokens(fastify: FastifyInstance, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const userId = await fastify.redis.get(`refresh:${tokenHash}`);
  if (!userId) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Rotate: delete old token
  await fastify.redis.del(`refresh:${tokenHash}`);

  const user = await fastify.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return generateTokens(fastify, user.id, user.email);
}

export async function logoutUser(fastify: FastifyInstance, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await fastify.redis.del(`refresh:${tokenHash}`);
}

export async function findOrCreateOAuthUser(
  fastify: FastifyInstance,
  email: string,
  displayName: string | null,
  avatarUrl: string | null,
  oauthProviderId: string,
) {
  let user = await fastify.prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    user = await fastify.prisma.user.create({
      data: {
        email,
        displayName,
        avatarUrl,
        authProvider: 'GOOGLE',
        oauthProviderId,
        profile: { create: {} },
        settings: { create: {} },
      },
      select: { id: true, email: true },
    });
  }

  return generateTokens(fastify, user.id, user.email);
}

async function generateTokens(fastify: FastifyInstance, userId: string, email: string) {
  const accessToken = fastify.jwt.sign({ sub: userId, email });

  const refreshToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(refreshToken);
  await fastify.redis.set(`refresh:${tokenHash}`, userId, 'EX', REFRESH_TOKEN_TTL);

  return { accessToken, refreshToken };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
