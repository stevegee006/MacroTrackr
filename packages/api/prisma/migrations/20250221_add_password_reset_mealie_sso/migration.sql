-- Add must_change_password to users
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- Add Mealie integration fields to user_settings
ALTER TABLE "user_settings" ADD COLUMN "mealie_url" TEXT;
ALTER TABLE "user_settings" ADD COLUMN "mealie_api_key" TEXT;

-- Expand AuthProvider enum
ALTER TYPE "AuthProvider" ADD VALUE 'GITHUB';
ALTER TYPE "AuthProvider" ADD VALUE 'SAML';
ALTER TYPE "AuthProvider" ADD VALUE 'OIDC';

-- Create SsoType enum
CREATE TYPE "SsoType" AS ENUM ('SAML', 'OIDC');

-- Create SSO providers table
CREATE TABLE "sso_providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "type" "SsoType" NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id")
);
