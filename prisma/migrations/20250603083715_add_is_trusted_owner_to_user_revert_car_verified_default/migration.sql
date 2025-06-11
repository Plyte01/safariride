-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "BookingStatus" ADD VALUE 'AWAITING_PAYMENT';
ALTER TYPE "BookingStatus" ADD VALUE 'ON_DELIVERY_PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isTrustedOwner" BOOLEAN NOT NULL DEFAULT false;
