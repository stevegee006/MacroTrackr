-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "birth_date" DATE;

-- CreateTable
CREATE TABLE "body_measurements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "measured_at" DATE NOT NULL,
    "waist" DOUBLE PRECISION,
    "hip" DOUBLE PRECISION,
    "abdomen" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "thigh_r" DOUBLE PRECISION,
    "thigh_l" DOUBLE PRECISION,
    "bicep_r" DOUBLE PRECISION,
    "bicep_l" DOUBLE PRECISION,
    "neck" DOUBLE PRECISION,
    "calf_r" DOUBLE PRECISION,
    "calf_l" DOUBLE PRECISION,
    "shoulder" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "file_path" TEXT NOT NULL,
    "taken_at" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "body_measurements_user_id_measured_at_idx" ON "body_measurements"("user_id", "measured_at");

-- CreateIndex
CREATE INDEX "progress_photos_user_id_taken_at_idx" ON "progress_photos"("user_id", "taken_at");

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
