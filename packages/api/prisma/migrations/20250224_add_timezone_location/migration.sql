-- Add timezone and location to user_settings
ALTER TABLE "user_settings" ADD COLUMN "timezone" VARCHAR(100);
ALTER TABLE "user_settings" ADD COLUMN "location" VARCHAR(255);
