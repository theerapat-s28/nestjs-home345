-- CreateEnum
CREATE TYPE "PortfolioRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('STOCK', 'CRYPTO', 'GOLD', 'FUTURES', 'FOREX', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT', 'DIVIDEND', 'SPLIT', 'FEE');

-- CreateEnum
CREATE TYPE "CashTxnType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BUY_DEBIT', 'SELL_CREDIT', 'DIVIDEND', 'FEE', 'TRANSFER');

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "currency" SET DEFAULT 'THB';

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "name" TEXT;

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseCurrency" "Currency" NOT NULL DEFAULT 'THB',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "role" "PortfolioRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_prices" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'THB',
    "source" TEXT,
    "recordedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_assets" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "quantity" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "avgCost" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "lastRecalculatedAt" TIMESTAMPTZ,
    "isRecalculating" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "portfolio_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "portfolioAssetId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "quantity" DECIMAL(20,8) NOT NULL,
    "pricePerUnit" DECIMAL(20,8) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'THB',
    "fee" DECIMAL(20,8),
    "note" TEXT,
    "executedAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_cash" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'THB',
    "balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "portfolio_cash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'THB',
    "type" "CashTxnType" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "relatedTxnId" TEXT,
    "note" TEXT,
    "executedAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolios_deletedAt_idx" ON "portfolios"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_members_userId_portfolioId_key" ON "portfolio_members"("userId", "portfolioId");

-- CreateIndex
CREATE INDEX "assets_type_idx" ON "assets"("type");

-- CreateIndex
CREATE INDEX "assets_deletedAt_idx" ON "assets"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "assets_symbol_type_key" ON "assets"("symbol", "type");

-- CreateIndex
CREATE INDEX "asset_prices_assetId_recordedAt_idx" ON "asset_prices"("assetId", "recordedAt");

-- CreateIndex
CREATE INDEX "asset_prices_currency_recordedAt_idx" ON "asset_prices"("currency", "recordedAt");

-- CreateIndex
CREATE INDEX "portfolio_assets_deletedAt_idx" ON "portfolio_assets"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_assets_portfolioId_assetId_key" ON "portfolio_assets"("portfolioId", "assetId");

-- CreateIndex
CREATE INDEX "transactions_portfolioAssetId_executedAt_idx" ON "transactions"("portfolioAssetId", "executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_cash_portfolioId_currency_key" ON "portfolio_cash"("portfolioId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "cash_transactions_relatedTxnId_key" ON "cash_transactions"("relatedTxnId");

-- CreateIndex
CREATE INDEX "cash_transactions_portfolioId_executedAt_idx" ON "cash_transactions"("portfolioId", "executedAt");

-- CreateIndex
CREATE INDEX "cash_transactions_currency_executedAt_idx" ON "cash_transactions"("currency", "executedAt");

-- AddForeignKey
ALTER TABLE "portfolio_members" ADD CONSTRAINT "portfolio_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_members" ADD CONSTRAINT "portfolio_members_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_prices" ADD CONSTRAINT "asset_prices_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_assets" ADD CONSTRAINT "portfolio_assets_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_assets" ADD CONSTRAINT "portfolio_assets_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_portfolioAssetId_fkey" FOREIGN KEY ("portfolioAssetId") REFERENCES "portfolio_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_cash" ADD CONSTRAINT "portfolio_cash_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_relatedTxnId_fkey" FOREIGN KEY ("relatedTxnId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
