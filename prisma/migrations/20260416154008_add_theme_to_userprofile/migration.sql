-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('ROOT', 'DEEP_NIGHT');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "theme" "Theme" NOT NULL DEFAULT 'ROOT';
