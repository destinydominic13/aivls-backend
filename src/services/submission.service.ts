import { prisma } from "@/config/db";
import { AppError } from "@/middleware/errorHandler";

interface SubmitInput {
  papersCollected: number;
  studentsPresent: number;
  studentsAbsent: number;
  notes?: string;
}

/**
 * The invigilator's closing report for their duty: papers collected and
 * attendance counts. One per allocation — filing it also marks that
 * allocation COMPLETED, since submitting the report is the natural signal
 * that their duty is done.
 */
export async function submitReport(
  invigilatorId: string,
  allocationId: string,
  input: SubmitInput
) {
  const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
  if (!allocation) throw new AppError("Allocation not found", 404);
  if (allocation.invigilatorId !== invigilatorId) {
    throw new AppError("This allocation does not belong to you", 403);
  }

  const existing = await prisma.examSubmission.findUnique({ where: { allocationId } });
  if (existing) {
    throw new AppError("A report has already been submitted for this duty", 409);
  }

  const [submission] = await prisma.$transaction([
    prisma.examSubmission.create({
      data: { allocationId, ...input },
    }),
    prisma.allocation.update({
      where: { id: allocationId },
      data: { status: "COMPLETED" },
    }),
  ]);

  return submission;
}

export function listSubmissionsForExam(examId: string) {
  return prisma.examSubmission.findMany({
    where: { allocation: { examId } },
    include: { allocation: { include: { invigilator: { include: { user: true } } } } },
    orderBy: { submittedAt: "desc" },
  });
}

export async function reviewSubmission(
  submissionId: string,
  reviewedById: string,
  archive: boolean
) {
  const submission = await prisma.examSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) throw new AppError("Submission not found", 404);

  return prisma.examSubmission.update({
    where: { id: submissionId },
    data: {
      status: archive ? "ARCHIVED" : "REVIEWED",
      reviewedAt: new Date(),
      reviewedById,
    },
  });
}
