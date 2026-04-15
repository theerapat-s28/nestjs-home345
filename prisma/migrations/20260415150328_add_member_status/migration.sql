-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "portfolio_members" ADD COLUMN     "status" "MemberStatus" NOT NULL DEFAULT 'PENDING';
