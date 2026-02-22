import type { FastifyInstance } from 'fastify';

const DEFAULTS: Record<string, string> = {
  signups_enabled: 'true',
};

export async function getConfig(fastify: FastifyInstance, key: string): Promise<string> {
  const row = await fastify.prisma.appConfig.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? '';
}

export async function setConfig(fastify: FastifyInstance, key: string, value: string): Promise<void> {
  await fastify.prisma.appConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getAppSettings(fastify: FastifyInstance) {
  const signupsEnabled = await getConfig(fastify, 'signups_enabled');
  return {
    signupsEnabled: signupsEnabled !== 'false',
  };
}

export async function updateAppSettings(
  fastify: FastifyInstance,
  settings: { signupsEnabled: boolean },
) {
  await setConfig(fastify, 'signups_enabled', String(settings.signupsEnabled));
  return getAppSettings(fastify);
}
