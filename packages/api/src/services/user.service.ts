import type { FastifyInstance } from 'fastify';
import type { UpdateProfileInput, UpdateSettingsInput } from '@macrotracker/shared';
import { NotFoundError } from '../utils/errors.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export async function getUser(fastify: FastifyInstance, userId: string) {
  const user = await fastify.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      authProvider: true,
      createdAt: true,
    },
  });
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function updateUser(
  fastify: FastifyInstance,
  userId: string,
  data: { displayName?: string; avatarUrl?: string },
) {
  return fastify.prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      authProvider: true,
      createdAt: true,
    },
  });
}

export async function getProfile(fastify: FastifyInstance, userId: string) {
  const profile = await fastify.prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('User profile');
  return profile;
}

export async function updateProfile(
  fastify: FastifyInstance,
  userId: string,
  data: UpdateProfileInput,
) {
  return fastify.prisma.userProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

export async function getSettings(fastify: FastifyInstance, userId: string) {
  const settings = await fastify.prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) throw new NotFoundError('User settings');
  return {
    id: settings.id,
    userId: settings.userId,
    hasOpenaiKey: !!settings.openaiApiKey,
    preferredUnits: settings.preferredUnits,
    darkMode: settings.darkMode,
  };
}

export async function updateSettings(
  fastify: FastifyInstance,
  userId: string,
  data: UpdateSettingsInput,
) {
  const updateData: Record<string, unknown> = {};
  if (data.preferredUnits !== undefined) updateData.preferredUnits = data.preferredUnits;
  if (data.darkMode !== undefined) updateData.darkMode = data.darkMode;
  if (data.openaiApiKey !== undefined) {
    updateData.openaiApiKey = encrypt(data.openaiApiKey);
  }

  const settings = await fastify.prisma.userSettings.upsert({
    where: { userId },
    update: updateData,
    create: { userId, ...updateData },
  });

  return {
    id: settings.id,
    userId: settings.userId,
    hasOpenaiKey: !!settings.openaiApiKey,
    preferredUnits: settings.preferredUnits,
    darkMode: settings.darkMode,
  };
}

export async function getDecryptedApiKey(
  fastify: FastifyInstance,
  userId: string,
): Promise<string | null> {
  const settings = await fastify.prisma.userSettings.findUnique({ where: { userId } });
  if (!settings?.openaiApiKey) return null;
  return decrypt(settings.openaiApiKey);
}
