-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'GITHUB', 'SAML', 'OIDC');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTREMELY_ACTIVE');

-- CreateEnum
CREATE TYPE "Goal" AS ENUM ('LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE');

-- CreateEnum
CREATE TYPE "Units" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('OPENFOODFACTS', 'MANUAL', 'LABEL_SCAN');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "SsoType" AS ENUM ('SAML', 'OIDC');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "display_name" VARCHAR(100),
    "avatar_url" TEXT,
    "auth_provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "oauth_provider_id" VARCHAR(255),
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "age" INTEGER,
    "sex" "Sex",
    "activity_level" "ActivityLevel",
    "goal" "Goal",
    "target_calories" INTEGER,
    "target_protein_g" INTEGER,
    "target_carbs_g" INTEGER,
    "target_fat_g" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "openai_api_key" TEXT,
    "preferred_units" "Units" NOT NULL DEFAULT 'METRIC',
    "dark_mode" BOOLEAN NOT NULL DEFAULT false,
    "mealie_url" TEXT,
    "mealie_api_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barcode" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "brand" VARCHAR(255),
    "serving_size_g" DOUBLE PRECISION NOT NULL,
    "serving_unit" VARCHAR(20) NOT NULL DEFAULT 'g',
    "calories_per_100g" DOUBLE PRECISION NOT NULL,
    "protein_per_100g" DOUBLE PRECISION NOT NULL,
    "carbs_per_100g" DOUBLE PRECISION NOT NULL,
    "fat_per_100g" DOUBLE PRECISION NOT NULL,
    "fiber_per_100g" DOUBLE PRECISION,
    "sugar_per_100g" DOUBLE PRECISION,
    "sodium_per_100g" DOUBLE PRECISION,
    "image_url" TEXT,
    "source" "FoodSource" NOT NULL DEFAULT 'OPENFOODFACTS',
    "off_product_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "food_item_id" UUID NOT NULL,
    "log_date" DATE NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "serving_qty" DOUBLE PRECISION NOT NULL,
    "serving_size_g" DOUBLE PRECISION NOT NULL,
    "total_calories" DOUBLE PRECISION NOT NULL,
    "total_protein_g" DOUBLE PRECISION NOT NULL,
    "total_carbs_g" DOUBLE PRECISION NOT NULL,
    "total_fat_g" DOUBLE PRECISION NOT NULL,
    "total_fiber_g" DOUBLE PRECISION,
    "total_sugar_g" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "macro_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "goal" "Goal" NOT NULL,
    "target_calories" INTEGER NOT NULL,
    "target_protein_g" INTEGER NOT NULL,
    "target_carbs_g" INTEGER NOT NULL,
    "target_fat_g" INTEGER NOT NULL,
    "reasoning" TEXT NOT NULL,
    "input_snapshot" JSONB NOT NULL,
    "ai_model" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "macro_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "target_calories" INTEGER NOT NULL,
    "target_protein_g" INTEGER NOT NULL,
    "target_carbs_g" INTEGER NOT NULL,
    "target_fat_g" INTEGER NOT NULL,
    "plan_data" JSONB NOT NULL,
    "preferences" JSONB,
    "ai_model" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "type" "SsoType" NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "food_items_barcode_key" ON "food_items"("barcode");

-- CreateIndex
CREATE INDEX "food_items_barcode_idx" ON "food_items"("barcode");

-- CreateIndex
CREATE INDEX "food_items_name_idx" ON "food_items"("name");

-- CreateIndex
CREATE INDEX "food_logs_user_id_log_date_idx" ON "food_logs"("user_id", "log_date");

-- CreateIndex
CREATE INDEX "food_logs_log_date_idx" ON "food_logs"("log_date");

-- CreateIndex
CREATE INDEX "macro_plans_user_id_idx" ON "macro_plans"("user_id");

-- CreateIndex
CREATE INDEX "meal_plans_user_id_idx" ON "meal_plans"("user_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "macro_plans" ADD CONSTRAINT "macro_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
