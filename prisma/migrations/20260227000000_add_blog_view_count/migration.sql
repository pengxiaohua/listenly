-- CreateTable
CREATE TABLE "BlogViewCount" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogViewCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogViewCount_slug_key" ON "BlogViewCount"("slug");
