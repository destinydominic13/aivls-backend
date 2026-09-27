import { Router } from "express";
import { authenticate, requireRole } from "@/middleware/auth";
import { Role } from "@prisma/client";
import {
  me,
  myExams,
  enroll,
  unenroll,
  enrollFor,
  show,
} from "@/controllers/student.controller";

const router = Router();

// Self-service: a logged-in student viewing their own papers/venues.
router.get("/me", authenticate, requireRole(Role.STUDENT), me);
// GET /api/students/me/exams?today=true  -> just today's paper(s) + venue
// GET /api/students/me/exams             -> full upcoming schedule
router.get("/me/exams", authenticate, requireRole(Role.STUDENT), myExams);
router.post("/me/enrollments", authenticate, requireRole(Role.STUDENT), enroll);
router.delete("/me/enrollments/:enrollmentId", authenticate, requireRole(Role.STUDENT), unenroll);

// Admin / exam officer managing any student record (e.g. bulk course registration).
router.get("/:id", authenticate, requireRole(Role.ADMIN, Role.EXAM_OFFICER), show);
router.post(
  "/:id/enrollments",
  authenticate,
  requireRole(Role.ADMIN, Role.EXAM_OFFICER),
  enrollFor
);

export default router;
