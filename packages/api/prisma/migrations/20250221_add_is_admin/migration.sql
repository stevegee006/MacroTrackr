-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- Set the first registered user as admin
UPDATE "users" SET "is_admin" = true
WHERE "id" = (SELECT "id" FROM "users" ORDER BY "created_at" ASC LIMIT 1);
