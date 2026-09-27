import { Router } from "express";
import { authenticate, requireRole } from "@/middleware/auth";
import { Role } from "@prisma/client";
import {
  index,
  show,
  addUnavailability,
  addConflictOfInterest,
  toggleAvailability,
  me,
} from "@/controllers/invigilator.controller";

const router = Router();

router.get("/me", authenticate, requireRole(Role.INVIGILATOR), me);

router.get("/", authenticate, requireRole(Role.ADMIN, Role.EXAM_OFFICER), index);
router.get("/:id", authenticate, requireRole(Role.ADMIN, Role.EXAM_OFFICER), show);

router.post("/:id/unavailability", authenticate, addUnavailability);
router.post("/:id/conflicts", authenticate, addConflictOfInterest);
router.patch(
  "/:id/availability",
  authenticate,
  requireRole(Role.ADMIN, Role.EXAM_OFFICER),
  toggleAvailability
);

export default router;
