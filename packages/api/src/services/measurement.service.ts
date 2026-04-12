import type { FastifyInstance } from 'fastify';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export async function createMeasurement(
  fastify: FastifyInstance,
  userId: string,
  data: {
    measuredAt: string;
    waist?: number | null;
    hip?: number | null;
    abdomen?: number | null;
    chest?: number | null;
    thighR?: number | null;
    thighL?: number | null;
    bicepR?: number | null;
    bicepL?: number | null;
    neck?: number | null;
    calfR?: number | null;
    calfL?: number | null;
    shoulder?: number | null;
    notes?: string;
  },
) {
  return fastify.prisma.bodyMeasurement.create({
    data: {
      userId,
      measuredAt: new Date(data.measuredAt + 'T00:00:00Z'),
      waist: data.waist ?? null,
      hip: data.hip ?? null,
      abdomen: data.abdomen ?? null,
      chest: data.chest ?? null,
      thighR: data.thighR ?? null,
      thighL: data.thighL ?? null,
      bicepR: data.bicepR ?? null,
      bicepL: data.bicepL ?? null,
      neck: data.neck ?? null,
      calfR: data.calfR ?? null,
      calfL: data.calfL ?? null,
      shoulder: data.shoulder ?? null,
      notes: data.notes ?? null,
    },
  });
}

export async function getMeasurements(
  fastify: FastifyInstance,
  userId: string,
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    fastify.prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
      skip,
      take: limit,
    }),
    fastify.prisma.bodyMeasurement.count({ where: { userId } }),
  ]);
  return { data: items, meta: { page, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function deleteMeasurement(
  fastify: FastifyInstance,
  userId: string,
  id: string,
) {
  const entry = await fastify.prisma.bodyMeasurement.findUnique({ where: { id } });
  if (!entry) throw new NotFoundError('Measurement');
  if (entry.userId !== userId) throw new ForbiddenError('Not your measurement');
  await fastify.prisma.bodyMeasurement.delete({ where: { id } });
}
