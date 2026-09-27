import { Router } from "express";
import { authenticate, requireRole } from "@/middleware/auth";
import { Role } from "@prisma/client";
import { create, forExam, mine } from "@/controllers/incident.controller";

const router = Router();

router.post("/", authenticate, requireRole(Role.INVIGILATOR), create);
router.get("/mine", authenticate, requireRole(Role.INVIGILATOR), mine);
router.get(
  "/exams/:examId",
  authenticate,
  requireRole(Role.ADMIN, Role.EXAM_OFFICER),
  forExam
);

export default router;
