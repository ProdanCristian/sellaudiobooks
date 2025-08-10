/*
  Warnings:

  - You are about to drop the `LuxuryVideos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Script` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Script" DROP CONSTRAINT "Script_userId_fkey";

-- DropTable
DROP TABLE "LuxuryVideos";

-- DropTable
DROP TABLE "Script";
