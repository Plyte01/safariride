/*
  Warnings:

  - Added the required column `category` to the `Car` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seats` to the `Car` table without a default value. This is not possible if the table is not empty.
  - Made the column `averageRating` on table `Car` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CarCategory" AS ENUM ('SUV', 'SEDAN', 'VAN', 'FOUR_BY_FOUR', 'LUXURY', 'HATCHBACK', 'TRUCK');

-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "availability" JSONB,
ADD COLUMN     "category" "CarCategory" NOT NULL,
ADD COLUMN     "imageUrls" TEXT[],
ADD COLUMN     "isListed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "seats" INTEGER NOT NULL,
ADD COLUMN     "totalRatings" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "averageRating" SET NOT NULL,
ALTER COLUMN "averageRating" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "Booking_carId_idx" ON "Booking"("carId");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Car_ownerId_idx" ON "Car"("ownerId");

-- CreateIndex
CREATE INDEX "Car_category_idx" ON "Car"("category");

-- CreateIndex
CREATE INDEX "Car_location_idx" ON "Car"("location");

-- CreateIndex
CREATE INDEX "Review_carId_idx" ON "Review"("carId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");
