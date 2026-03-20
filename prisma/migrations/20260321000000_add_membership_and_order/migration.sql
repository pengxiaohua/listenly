-- AlterTable: 为 User 表添加会员字段
ALTER TABLE "User" ADD COLUMN "membershipLevel" TEXT;
ALTER TABLE "User" ADD COLUMN "membershipExpiresAt" TIMESTAMP(3);

-- CreateTable: 支付订单表
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "outTradeNo" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_outTradeNo_key" ON "Order"("outTradeNo");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
