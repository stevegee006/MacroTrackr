import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { AppError, UnauthorizedError } from '../utils/errors.js';

const CHALLENGE_TTL = 300; // 5 minutes

function getRpConfig() {
  const url = new URL(env.FRONTEND_URL);
  return {
    rpName: 'MacroTracker',
    rpID: url.hostname,
    origin: env.FRONTEND_URL,
  };
}

/**
 * Generate registration options for an authenticated user adding a passkey
 */
export async function generateRegOptions(fastify: FastifyInstance, userId: string) {
  const user = await fastify.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, passkeys: true },
  });

  if (!user) throw new UnauthorizedError('User not found');

  const { rpName, rpID } = getRpConfig();

  const existingCredentials = user.passkeys.map((pk) => ({
    id: pk.credentialId,
    transports: pk.transports as AuthenticatorTransport[],
  }));

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.displayName || user.email,
    excludeCredentials: existingCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    attestationType: 'none',
  });

  // Store challenge in Redis
  await fastify.redis.set(
    `webauthn:reg:${userId}`,
    options.challenge,
    'EX',
    CHALLENGE_TTL,
  );

  return options;
}

type AuthenticatorTransport = 'ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb';

/**
 * Verify registration and store the new passkey
 */
export async function verifyRegistration(
  fastify: FastifyInstance,
  userId: string,
  response: RegistrationResponseJSON,
  friendlyName?: string,
) {
  const challenge = await fastify.redis.get(`webauthn:reg:${userId}`);
  if (!challenge) throw new AppError(400, 'BAD_REQUEST', 'Registration challenge expired');

  const { rpID, origin } = getRpConfig();

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new AppError(400, 'BAD_REQUEST', 'Passkey registration verification failed');
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  // Store the passkey
  await fastify.prisma.passkey.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: BigInt(credential.counter),
      transports: (response.response.transports ?? []) as string[],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      friendlyName: friendlyName || null,
    },
  });

  // Clean up challenge
  await fastify.redis.del(`webauthn:reg:${userId}`);

  return { verified: true };
}

/**
 * Generate authentication options (for login — no user ID needed yet)
 */
export async function generateAuthOptions(fastify: FastifyInstance, email?: string) {
  const { rpID } = getRpConfig();

  let allowCredentials: { id: string; transports?: AuthenticatorTransport[] }[] | undefined;

  // If email is provided, scope to that user's passkeys
  if (email) {
    const user = await fastify.prisma.user.findUnique({
      where: { email },
      select: { passkeys: true },
    });

    if (user && user.passkeys.length > 0) {
      allowCredentials = user.passkeys.map((pk) => ({
        id: pk.credentialId,
        transports: pk.transports as AuthenticatorTransport[],
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  });

  // Store challenge keyed by the challenge itself (since we don't know the user yet)
  await fastify.redis.set(
    `webauthn:auth:${options.challenge}`,
    'pending',
    'EX',
    CHALLENGE_TTL,
  );

  return options;
}

/**
 * Verify authentication response and return tokens
 */
export async function verifyAuthentication(
  fastify: FastifyInstance,
  response: AuthenticationResponseJSON,
  challenge: string,
) {
  // Validate challenge exists
  const stored = await fastify.redis.get(`webauthn:auth:${challenge}`);
  if (!stored) throw new UnauthorizedError('Authentication challenge expired');

  // Look up the passkey by credential ID
  const passkey = await fastify.prisma.passkey.findUnique({
    where: { credentialId: response.id },
    include: { user: { select: { id: true, email: true, isAdmin: true } } },
  });

  if (!passkey) throw new UnauthorizedError('Passkey not recognized');

  const { rpID, origin } = getRpConfig();

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: passkey.credentialId,
      publicKey: Buffer.from(passkey.publicKey, 'base64url'),
      counter: Number(passkey.counter),
      transports: passkey.transports as AuthenticatorTransport[],
    },
  });

  if (!verification.verified) {
    throw new UnauthorizedError('Passkey authentication failed');
  }

  // Update counter and last used
  await fastify.prisma.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  // Clean up challenge
  await fastify.redis.del(`webauthn:auth:${challenge}`);

  return passkey.user;
}

/**
 * List passkeys for a user
 */
export async function listPasskeys(fastify: FastifyInstance, userId: string) {
  return fastify.prisma.passkey.findMany({
    where: { userId },
    select: {
      id: true,
      friendlyName: true,
      deviceType: true,
      backedUp: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete a passkey
 */
export async function deletePasskey(fastify: FastifyInstance, userId: string, passkeyId: string) {
  const passkey = await fastify.prisma.passkey.findFirst({
    where: { id: passkeyId, userId },
  });

  if (!passkey) throw new AppError(404, 'NOT_FOUND', 'Passkey not found');

  await fastify.prisma.passkey.delete({ where: { id: passkeyId } });
}
