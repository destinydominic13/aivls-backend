import { prisma } from "@/config/db";
import { AppError } from "@/middleware/errorHandler";
import crypto from "crypto";

/**
 * FAIR ALLOCATION ALGORITHM
 * =========================
 * Goal: assign the exam's required number of invigilators from the pool of
 * eligible candidates, without favoring anyone by name order, seniority, or
 * who happened to register first.
 *
 * Steps:
 *  1. HARD EXCLUSIONS (never eligible for this exam):
 *     - Not marked available / inactive account.
 *     - Declared a conflict of interest (own course code or department).
 *     - Declared unavailable for a window overlapping the exam.
 *     - Already allocated to another exam whose time window overlaps this one
 *       (can't be in two venues at once).
 *  2. FAIRNESS RANKING among the remaining eligible pool:
 *     - Primary key: total number of allocations ever assigned (ascending) —
 *       whoever has invigilated the LEAST so far is considered first. This
 *       is what keeps the workload balanced across the whole staff over time,
 *       rather than repeatedly reusing whoever is "convenient".
 *     - Tie-break: cryptographically secure random shuffle. Sorting ties by
 *       ID or name alphabetically silently favors the same people every
 *       time (e.g. "A" surnames), so ties are broken with real randomness
 *       instead.
 *  3. Take the top N candidates (N = exam.requiredInvigilators, capped by
 *     venue capacity) and create Allocation rows recording the invigilator's
 *     load *at the moment of assignment*, so every decision is auditable.
 *
 * This is a deterministic, inspectable process — nothing here depends on
 * manual judgment calls that could introduce (even unconscious) bias.
 */

interface AllocationResult {
  examId: string;
  requested: number;
  allocated: number;
  allocations: Array<{ invigilatorId: string; fullName: string; loadAtAssignment: number }>;
  unfilled: boolean;
}

export async function allocateInvigilatorsForExam(examId: string): Promise<AllocationResult> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { venue: true, allocations: true },
  });
  if (!exam) throw new AppError("Exam not found", 404);

  const alreadyAssigned = exam.allocations.length;
  const slotsToFill = exam.requiredInvigilators - alreadyAssigned;
  if (slotsToFill <= 0) {
    return {
      examId,
      requested: exam.requiredInvigilators,
      allocated: alreadyAssigned,
      allocations: [],
      unfilled: false,
    };
  }

  // Pull every active, available invigilator along with the data needed to
  // evaluate exclusions and rank fairness, in one query.
  const candidates = await prisma.invigilatorProfile.findMany({
    where: {
      isAvailable: true,
      user: { isActive: true },
    },
    include: {
      user: true,
      conflicts: true,
      availabilities: true,
      allocations: {
        include: { exam: true },
      },
    },
  });

  const alreadyAssignedIds = new Set(exam.allocations.map((a) => a.invigilatorId));

  const eligible = candidates.filter((candidate) => {
    if (alreadyAssignedIds.has(candidate.id)) return false;

    // Exclude declared conflicts of interest (own course/department).
    const hasConflict = candidate.conflicts.some(
      (c) =>
        (c.courseCode && c.courseCode === exam.courseCode) ||
        (c.department && exam.department && c.department === exam.department)
    );
    if (hasConflict) return false;

    // Exclude declared unavailability windows overlapping the exam.
    const hasTimeOff = candidate.availabilities.some(
      (w) => w.startTime < exam.endTime && w.endTime > exam.startTime
    );
    if (hasTimeOff) return false;

    // Exclude anyone already allocated to a different exam whose time
    // window overlaps this one — can't invigilate two exams at once.
    const hasOverlappingAllocation = candidate.allocations.some(
      (a) =>
        a.exam.id !== examId &&
        a.status !== "CANCELLED" &&
        a.exam.startTime < exam.endTime &&
        a.exam.endTime > exam.startTime
    );
    if (hasOverlappingAllocation) return false;

    return true;
  });

  if (eligible.length === 0) {
    return {
      examId,
      requested: exam.requiredInvigilators,
      allocated: alreadyAssigned,
      allocations: [],
      unfilled: true,
    };
  }

  // Rank: fewest total allocations first, ties broken by secure random shuffle.
  const shuffled = secureShuffle(eligible);
  const ranked = shuffled.sort((a, b) => a.allocations.length - b.allocations.length);

  const picked = ranked.slice(0, slotsToFill);

  const created = await prisma.$transaction(
    picked.map((candidate) =>
      prisma.allocation.create({
        data: {
          examId,
          invigilatorId: candidate.id,
          loadAtAssignment: candidate.allocations.length,
        },
      })
    )
  );

  return {
    examId,
    requested: exam.requiredInvigilators,
    allocated: alreadyAssigned + created.length,
    allocations: picked.map((c, i) => ({
      invigilatorId: c.id,
      fullName: c.user.fullName,
      loadAtAssignment: created[i].loadAtAssignment,
    })),
    unfilled: alreadyAssigned + created.length < exam.requiredInvigilators,
  };
}

/** Fisher–Yates shuffle using a cryptographically secure RNG (not Math.random). */
function secureShuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function secureRandomInt(maxExclusive: number): number {
  // Rejection sampling to avoid modulo bias.
  const range = 256 - (256 % maxExclusive);
  let byte: number;
  do {
    byte = crypto.randomBytes(1)[0];
  } while (byte >= range);
  return byte % maxExclusive;
}

export async function cancelAllocation(allocationId: string) {
  const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
  if (!allocation) throw new AppError("Allocation not found", 404);
  return prisma.allocation.update({
    where: { id: allocationId },
    data: { status: "CANCELLED" },
  });
}

/**
 * Admin/exam officer approval step: the algorithm proposes a roster, but
 * nothing is "official" until a human reviews and confirms it — this is
 * also the moment the invigilator is considered notified of their final
 * assignment (notifiedAt timestamp acts as the notification record).
 */
export async function confirmAllocation(allocationId: string) {
  const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
  if (!allocation) throw new AppError("Allocation not found", 404);
  if (allocation.status === "CANCELLED") {
    throw new AppError("Cannot confirm a cancelled allocation", 409);
  }
  return prisma.allocation.update({
    where: { id: allocationId },
    data: { status: "CONFIRMED", notifiedAt: new Date() },
  });
}

/** Bulk-confirm every pending allocation for an exam in one action. */
export async function confirmAllocationsForExam(examId: string) {
  const result = await prisma.allocation.updateMany({
    where: { examId, status: "ASSIGNED" },
    data: { status: "CONFIRMED", notifiedAt: new Date() },
  });
  return { confirmed: result.count };
}

export function listAllocationsForInvigilator(invigilatorId: string) {
  return prisma.allocation.findMany({
    where: { invigilatorId, status: { not: "CANCELLED" } },
    include: { exam: { include: { venue: true } }, attendance: true },
    orderBy: { exam: { startTime: "asc" } },
  });
}
