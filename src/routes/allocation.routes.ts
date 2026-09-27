import { Router } from "express";
import { authenticate, requireRole } from "@/middleware/auth";
import { Role } from "@prisma/client";
import {
  runAllocation,
  cancel,
  confirm,
  confirmAllForExam,
  myAllocations,
} from "@/controllers/allocation.controller";

const router = Router();

// Triggers the fair allocation algorithm for a given exam, filling any
// remaining slots. Safe to call again later (e.g. after someone cancels).
router.post(
  "/exams/:examId/allocate",
  authenticate,
  requireRole(Role.ADMIN, Role.EXAM_OFFICER),
  runAllocation
);

// Approval step: nothing is "official" (or notified) until confirmed.
router.patch("/:id/confirm", authenticate, requireRole(Role.ADMIN, Role.EXAM_OFFICER), confirm);
router.post(
  "/exams/:examId/confirm-all",
  authenticate,
  requireRole(Role.ADMIN, Role.EXAM_OFFICER),
  confirmAllForExam
);

router.patch("/:id/cancel", authenticate, requireRole(Role.ADMIN, Role.EXAM_OFFICER), cancel);

router.get("/mine", authenticate, requireRole(Role.INVIGILATOR), myAllocations);

export default router;
