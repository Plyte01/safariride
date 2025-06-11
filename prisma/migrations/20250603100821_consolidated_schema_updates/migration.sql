-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'CANCELLED_BY_USER';
ALTER TYPE "BookingStatus" ADD VALUE 'CANCELLED_BY_OWNER';
ALTER TYPE "BookingStatus" ADD VALUE 'NO_SHOW';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CarCategory" ADD VALUE 'CONVERTIBLE';
ALTER TYPE "CarCategory" ADD VALUE 'COUPE';
ALTER TYPE "CarCategory" ADD VALUE 'MINIVAN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_SUCCESSFUL';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_PROCESSED';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_REVIEW';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE 'CAR_LISTING_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CAR_LISTING_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'MESSAGE_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'PROMOTION';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM_ALERT';

-- CreateIndex
CREATE INDEX "Booking_startDate_endDate_idx" ON "Booking"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
