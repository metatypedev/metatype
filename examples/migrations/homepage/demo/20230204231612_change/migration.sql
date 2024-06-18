/*
  Warnings:

  - Made the column `email` on table `feedback` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "feedback" ALTER COLUMN "email" SET NOT NULL;
