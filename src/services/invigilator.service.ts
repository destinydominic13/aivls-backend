import { prisma } from "@/config/db";
import { AppError } from "@/middleware/errorHandler";

export function listInvigilators() {
  return prisma.invigilatorProfile.findMany({
    include: { user: true },
    orderBy: { user: { fullName: "asc" } },
  });
}

export async function getInvigilator(id: string) {
  const invigilator = await prisma.invigilatorProfile.findUnique({
    where: { id },
    include: { user: true, availabilities: true, conflicts: true },
  });
  if (!invigilator) throw new AppError("Invigilator not found", 404);
  return invigilator;
}

export function addAvailabilityWindow(
  invigilatorId: string,
  startTime: Date,
  endTime: Date,
  reason?: string
) {
  if (endTime <= startTime) {
    throw new AppError("End time must be after start time", 422);
  }
  return prisma.availability.create({
    data: { invigilatorId, startTime, endTime, reason },
  });
}

export function addConflict(
  invigilatorId: string,
  input: { courseCode?: string; department?: string; reason?: string }
) {
  if (!input.courseCode && !input.department) {
    throw new AppError("Provide a courseCode or department for the conflict", 422);
  }
  return prisma.invigilatorConflict.create({
    data: { invigilatorId, ...input },
  });
}

export function setAvailabilityFlag(invigilatorId: string, isAvailable: boolean) {
  return prisma.invigilatorProfile.update({
    where: { id: invigilatorId },
    data: { isAvailable },
  });
}
