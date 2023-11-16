-- CreateTable
CREATE TABLE "bucket" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "bucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "bucketId" INTEGER NOT NULL,

    CONSTRAINT "idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vote" (
    "id" UUID NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "importance" TEXT,
    "desc" TEXT,
    "ideaId" UUID NOT NULL,

    CONSTRAINT "vote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "idea" ADD CONSTRAINT "idea_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "bucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote" ADD CONSTRAINT "vote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "idea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
