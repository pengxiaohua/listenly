-- AlterTable: Add status column to Video for soft-delete
ALTER TABLE "Video" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
