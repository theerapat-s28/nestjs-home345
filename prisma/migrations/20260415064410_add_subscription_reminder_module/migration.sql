-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'BANK_TRANSFER', 'CRYPTO');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'PUSH', 'SMS');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'THB');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "nextBillingDate" TIMESTAMPTZ NOT NULL,
    "paymentMethodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "provider" TEXT,
    "last4" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriptions_nextBillingDate_idx" ON "subscriptions"("nextBillingDate");

-- CreateIndex
CREATE INDEX "subscriptions_userId_isActive_idx" ON "subscriptions"("userId", "isActive");

-- CreateIndex
CREATE INDEX "subscriptions_deletedAt_idx" ON "subscriptions"("deletedAt");

-- CreateIndex
CREATE INDEX "payment_methods_deletedAt_idx" ON "payment_methods"("deletedAt");

-- CreateIndex
CREATE INDEX "reminders_isSent_idx" ON "reminders"("isSent");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_subscriptionId_daysBefore_channel_key" ON "reminders"("subscriptionId", "daysBefore", "channel");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
