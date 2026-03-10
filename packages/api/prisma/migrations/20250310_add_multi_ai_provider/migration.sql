-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI');

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN "anthropic_api_key" TEXT;
ALTER TABLE "user_settings" ADD COLUMN "gemini_api_key" TEXT;
ALTER TABLE "user_settings" ADD COLUMN "ai_provider" "AiProvider" NOT NULL DEFAULT 'OPENAI';
