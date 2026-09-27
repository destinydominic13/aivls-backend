import { prisma } from "@/config/db";
import { AppError } from "@/middleware/errorHandler";
import { IncidentType } from "@prisma/client";

/**
 * Logging an incident requires the invigilator to actually be assigned to
 * that exam — prevents anyone from filing reports against exams they have
 * no connection to.
 */
export async function reportIncident(
  invigilatorId: string,
  examId: string,
  type: IncidentType,
  description: string
) {
  const allocation = await prisma.allocation.findUnique({
    where: { examId_invigilatorId: { examId, invigilatorId } },
  });
  if (!allocation || allocation.status === "CANCELLED") {
    throw new AppError("You are not assigned to this exam", 403);
  }

  return prisma.incident.create({
    data: { examId, reportedById: invigilatorId, type, description },
  });
}

export function listIncidentsForExam(examId: string) {
  return prisma.incident.findMany({
    where: { examId },
    include: { reportedBy: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function listIncidentsReportedBy(invigilatorId: string) {
  return prisma.incident.findMany({
    where: { reportedById: invigilatorId },
    include: { exam: true },
    orderBy: { createdAt: "desc" },
  });
}
