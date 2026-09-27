-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('CHEATING', 'MEDICAL', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'REVIEWED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Allocation" ADD COLUMN     "notifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSubmission" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "papersCollected" INTEGER NOT NULL,
    "studentsPresent" INTEGER NOT NULL,
    "studentsAbsent" INTEGER NOT NULL,
    "notes" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "ExamSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_examId_idx" ON "Incident"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubmission_allocationId_key" ON "ExamSubmission"("allocationId");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "InvigilatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubmission" ADD CONSTRAINT "ExamSubmission_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
