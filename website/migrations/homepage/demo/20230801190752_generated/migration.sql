/*
  Warnings:

  - You are about to alter the column `message` on the `feedback` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2000)`.

*/
-- AlterTable
ALTER TABLE "feedback" ALTER COLUMN "message" SET DATA TYPE VARCHAR(2000);
