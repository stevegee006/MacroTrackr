import OpenAI from 'openai';
import type { FastifyInstance } from 'fastify';
import { getDecryptedApiKey } from './user.service.js';
import { ValidationError, AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export async function getOpenAIClient(
  fastify: FastifyInstance,
  userId: string,
): Promise<OpenAI> {
  const apiKey = await getDecryptedApiKey(fastify, userId);
  if (!apiKey) {
    throw new ValidationError('No OpenAI API key configured. Please add your API key in settings.');
  }
  return new OpenAI({ apiKey });
}

export async function chatCompletion(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {},
): Promise<{ content: string; model: string; usage: { promptTokens: number; completionTokens: number } }> {
  const model = options.model ?? 'gpt-4o-mini';

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new AppError(502, 'AI_ERROR', 'OpenAI returned an empty response');
    }

    logger.info(
      {
        model,
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
      },
      'OpenAI completion',
    );

    return {
      content,
      model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
      },
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;

    if (error?.status === 401) {
      throw new ValidationError(
        'Invalid OpenAI API key. Please check your API key in settings.',
      );
    }
    if (error?.status === 429) {
      throw new AppError(
        429,
        'RATE_LIMITED',
        'OpenAI rate limit reached. Please wait a moment and try again.',
      );
    }

    logger.error({ error: error.message }, 'OpenAI API error');
    throw new AppError(502, 'AI_ERROR', 'Failed to generate AI response. Please try again.');
  }
}
