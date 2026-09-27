import { Router } from "express";
import { authenticate, requireRole } from "@/middleware/auth";
import { Role } from "@prisma/client";
import { create, forExam, review } from "@/controllers/submission.controller";

const router = Router();

router.post("/", authenticate, requireRole(Role.INVIGILATOR), create);
router.get(
  "/exams/:examId",
  authenticate,
  requireRole(Role.ADMIN, Role.EXAM_OFFICER),
  forExam
);
router.patch(
  "/:id/review",
  authenticate,
  requireRole(Role.ADMIN, Role.EXAM_OFFICER),
  review
);

export default router;
