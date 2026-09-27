import { Router } from "express";
import { authenticate, requireRole } from "@/middleware/auth";
import { Role } from "@prisma/client";
import { index, show, create, update, destroy } from "@/controllers/venue.controller";

const router = Router();

// Anyone authenticated can view venues (invigilators need this to locate them)
router.get("/", authenticate, index);
router.get("/:id", authenticate, show);

// Only admins/exam officers can manage venues
router.post("/", authenticate, requireRole(Role.ADMIN, Role.EXAM_OFFICER), create);
router.patch("/:id", authenticate, requireRole(Role.ADMIN, Role.EXAM_OFFICER), update);
router.delete("/:id", authenticate, requireRole(Role.ADMIN), destroy);

export default router;
