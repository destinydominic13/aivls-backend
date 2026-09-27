import { Prisma } from "@prisma/client";
import { prisma } from "@/config/db";
import { AppError } from "@/middleware/errorHandler";

export async function getStudentProfile(id: string) {
  const student = await prisma.studentProfile.findUnique({
    where: { id },
    include: { user: true, enrollments: true },
  });
  if (!student) throw new AppError("Student profile not found", 404);
  return student;
}

export async function addEnrollment(
  studentId: string,
  courseCode: string,
  courseTitle?: string
) {
  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseCode: { studentId, courseCode } },
  });
  if (existing) {
    throw new AppError("Already enrolled in this course", 409);
  }
  return prisma.enrollment.create({
    data: { studentId, courseCode, courseTitle },
  });
}

export async function removeEnrollment(studentId: string, enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment || enrollment.studentId !== studentId) {
    throw new AppError("Enrollment not found", 404);
  }
  return prisma.enrollment.delete({ where: { id: enrollmentId } });
}

/**
 * A student's exam papers, with venue info attached, matched purely by
 * enrolled course code — no manual linking required. Pass `todayOnly` to
 * scope it to "what am I sitting today", which is the headline use case:
 * the student opens the app and immediately sees today's paper(s) and
 * exactly where to go.
 */
export async function listExamsForStudent(studentId: string, todayOnly: boolean) {
  const enrollments = await prisma.enrollment.findMany({ where: { studentId } });
  const courseCodes = enrollments.map((e) => e.courseCode);

  if (courseCodes.length === 0) return [];

  const where: Prisma.ExamWhereInput = {
    courseCode: { in: courseCodes },
    status: { not: "CANCELLED" },
  };

  if (todayOnly) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    where.startTime = { gte: startOfDay, lt: endOfDay };
  }

  return prisma.exam.findMany({
    where,
    include: { venue: true },
    orderBy: { startTime: "asc" },
  });
}
