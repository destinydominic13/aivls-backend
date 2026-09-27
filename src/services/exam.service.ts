import { prisma } from "@/config/db";
import { AppError } from "@/middleware/errorHandler";

interface ExamInput {
  courseCode: string;
  courseTitle: string;
  department?: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  venueId: string;
  requiredInvigilators?: number;
}

export function listExams() {
  return prisma.exam.findMany({
    include: {
      venue: true,
      allocations: {
        include: { invigilator: { include: { user: true } }, attendance: true },
      },
    },
    orderBy: { startTime: "asc" },
  });
}

export async function getExam(id: string) {
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      venue: true,
      allocations: {
        include: { invigilator: { include: { user: true } }, attendance: true },
      },
    },
  });
  if (!exam) throw new AppError("Exam not found", 404);
  return exam;
}

export async function createExam(input: ExamInput) {
  if (input.endTime <= input.startTime) {
    throw new AppError("Exam end time must be after start time", 422);
  }

  const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
  if (!venue) throw new AppError("Venue not found", 404);

  // Prevent double-booking the same venue for an overlapping time window.
  const clash = await prisma.exam.findFirst({
    where: {
      venueId: input.venueId,
      status: { not: "CANCELLED" },
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
  });
  if (clash) {
    throw new AppError(
      `Venue is already booked for "${clash.courseCode}" during that time window`,
      409
    );
  }

  return prisma.exam.create({ data: input, include: { venue: true } });
}

export async function updateExam(id: string, input: Partial<ExamInput>) {
  await getExam(id);
  return prisma.exam.update({ where: { id }, data: input, include: { venue: true } });
}

export async function deleteExam(id: string) {
  await getExam(id);
  return prisma.exam.delete({ where: { id } });
}
