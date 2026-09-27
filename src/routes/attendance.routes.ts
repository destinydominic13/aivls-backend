import { Router } from "express";
import { authenticate, requireRole } from "@/middleware/auth";
import { Role } from "@prisma/client";
import { checkIn, forExam } from "@/controllers/attendance.controller";

const router = Router();

// Manual fallback for when GPS is unreliable indoors.
router.post(
  "/allocations/:allocationId/check-in",
  authenticate,
  requireRole(Role.INVIGILATOR),
  checkIn
);

router.get(
  "/exams/:examId",
  authenticate,
  requireRole(Role.ADMIN, Role.EXAM_OFFICER),
  forExam
);

export default router;
