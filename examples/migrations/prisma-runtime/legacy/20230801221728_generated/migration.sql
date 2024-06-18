/*
  Warnings:

  - You are about to alter the column `firstname` on the `user` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2000)`.

*/
-- AlterTable
ALTER TABLE "user" ALTER COLUMN "firstname" SET DATA TYPE VARCHAR(2000);
