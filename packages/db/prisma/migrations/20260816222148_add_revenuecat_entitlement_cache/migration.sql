-- CreateTable
CREATE TABLE "revenue_cat_entitlements" (
    "userId" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "productId" TEXT,
    "store" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_cat_entitlements_pkey" PRIMARY KEY ("userId","entitlementId")
);

-- AddForeignKey
ALTER TABLE "revenue_cat_entitlements" ADD CONSTRAINT "revenue_cat_entitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
