/*
  Warnings:

  - You are about to drop the column `verificationCodeHash` on the `collection_cases` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "collection_cases" DROP COLUMN "verificationCodeHash";
