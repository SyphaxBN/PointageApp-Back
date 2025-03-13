/*
  Warnings:

  - You are about to drop the column `location` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `googlePlaceId` on the `Location` table. All the data in the column will be lost.
  - Made the column `latitude` on table `Attendance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `Attendance` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "location",
ADD COLUMN     "location_id" TEXT,
ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "latitude" SET DEFAULT 0.0,
ALTER COLUMN "longitude" SET NOT NULL,
ALTER COLUMN "longitude" SET DEFAULT 0.0;

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "googlePlaceId";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
