-- CreateTable
CREATE TABLE "free_film" (
    "tmdbId" INTEGER NOT NULL,
    "archiveIdentifier" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "licenseUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "free_film_pkey" PRIMARY KEY ("tmdbId")
);

-- CreateIndex
CREATE UNIQUE INDEX "free_film_archiveIdentifier_key" ON "free_film"("archiveIdentifier");
