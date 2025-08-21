-- AlterTable
-- Step 1: Update existing NULL values to a default value (e.g., true)
UPDATE "ApiKey" SET "enabled" = true WHERE "enabled" IS NULL;
-- Step 2: Alter the column to be NOT NULL
ALTER TABLE "ApiKey" ALTER COLUMN "enabled" SET NOT NULL;
