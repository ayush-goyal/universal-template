/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `revenue_cat_entitlements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "revenue_cat_entitlements" DROP CONSTRAINT "revenue_cat_entitlements_userId_fkey";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "stripeCustomerId";

-- DropTable
DROP TABLE "revenue_cat_entitlements";

-- DropTable
DROP TABLE "subscription";
