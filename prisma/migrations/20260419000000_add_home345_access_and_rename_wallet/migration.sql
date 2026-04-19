-- AlterTable: add hasHome345Access to users (safe, defaults to false)
ALTER TABLE "users" ADD COLUMN "hasHome345Access" BOOLEAN NOT NULL DEFAULT false;

-- RenameTable: preserve all data in home345_wallets
ALTER TABLE "home345_wallets" RENAME TO "home345_transactions";
