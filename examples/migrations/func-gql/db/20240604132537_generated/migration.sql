-- CreateTable
CREATE TABLE "idea" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,
    "authorEmail" TEXT NOT NULL,

    CONSTRAINT "idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vote" (
    "id" UUID NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "ideaId" UUID NOT NULL,

    CONSTRAINT "vote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "vote" ADD CONSTRAINT "vote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "idea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
