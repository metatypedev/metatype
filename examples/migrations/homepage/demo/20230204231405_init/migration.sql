-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "message" TEXT NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);
