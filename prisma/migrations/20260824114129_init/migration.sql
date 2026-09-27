-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EXAM_OFFICER', 'INVIGILATOR');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('ASSIGNED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('AUTO_GEOFENCE', 'MANUAL');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'INVIGILATOR',
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvigilatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxPerWeek" INTEGER NOT NULL DEFAULT 5,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvigilatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "invigilatorId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvigilatorConflict" (
    "id" TEXT NOT NULL,
    "invigilatorId" TEXT NOT NULL,
    "courseCode" TEXT,
    "department" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvigilatorConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "block" TEXT,
    "room" TEXT,
    "capacity" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "geofenceRadius" INTEGER NOT NULL DEFAULT 75,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "department" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "venueId" TEXT NOT NULL,
    "requiredInvigilators" INTEGER NOT NULL DEFAULT 1,
    "status" "ExamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "invigilatorId" TEXT NOT NULL,
    "status" "AllocationStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loadAtAssignment" INTEGER NOT NULL,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkInLat" DOUBLE PRECISION,
    "checkInLng" DOUBLE PRECISION,
    "distanceMeters" DOUBLE PRECISION,
    "method" "AttendanceMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationPing" (
    "id" TEXT NOT NULL,
    "invigilatorId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationPing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "InvigilatorProfile_userId_key" ON "InvigilatorProfile"("userId");

-- CreateIndex
CREATE INDEX "Availability_invigilatorId_startTime_endTime_idx" ON "Availability"("invigilatorId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "InvigilatorConflict_invigilatorId_idx" ON "InvigilatorConflict"("invigilatorId");

-- CreateIndex
CREATE INDEX "Venue_latitude_longitude_idx" ON "Venue"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Exam_venueId_startTime_endTime_idx" ON "Exam"("venueId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Exam_date_idx" ON "Exam"("date");

-- CreateIndex
CREATE INDEX "Allocation_invigilatorId_idx" ON "Allocation"("invigilatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Allocation_examId_invigilatorId_key" ON "Allocation"("examId", "invigilatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_allocationId_key" ON "Attendance"("allocationId");

-- CreateIndex
CREATE INDEX "LocationPing_invigilatorId_recordedAt_idx" ON "LocationPing"("invigilatorId", "recordedAt");

-- AddForeignKey
ALTER TABLE "InvigilatorProfile" ADD CONSTRAINT "InvigilatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_invigilatorId_fkey" FOREIGN KEY ("invigilatorId") REFERENCES "InvigilatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvigilatorConflict" ADD CONSTRAINT "InvigilatorConflict_invigilatorId_fkey" FOREIGN KEY ("invigilatorId") REFERENCES "InvigilatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_invigilatorId_fkey" FOREIGN KEY ("invigilatorId") REFERENCES "InvigilatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPing" ADD CONSTRAINT "LocationPing_invigilatorId_fkey" FOREIGN KEY ("invigilatorId") REFERENCES "InvigilatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
