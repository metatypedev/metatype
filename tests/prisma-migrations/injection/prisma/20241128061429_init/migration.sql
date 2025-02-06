-- CreateTable
CREATE TABLE "Messages" (
    "id" UUID NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "text" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "recipientId" INTEGER NOT NULL,

    CONSTRAINT "Messages_pkey" PRIMARY KEY ("id")
);
