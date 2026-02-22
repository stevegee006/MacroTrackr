-- Add USDA to FoodSource enum
ALTER TYPE "FoodSource" ADD VALUE 'USDA';

-- Create app_config table for application-level settings
CREATE TABLE "app_config" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);
