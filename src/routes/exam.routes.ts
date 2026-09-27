import { Router } from "express";
import { authenticate, requireRole } from "@/middleware/auth";
import { Role } from "@prisma/client";
import { index, show, create, update, destroy } from "@/controllers/exam.controller";

const router = Router();

router.get("/", authenticate, index);
router.get("/:id", authenticate, show);

router.post("/", authenticate, requireRole(Role.ADMIN, Role.EXAM_OFFICER), create);
router.patch("/:id", authenticate, requireRole(Role.ADMIN, Role.EXAM_OFFICER), update);
router.delete("/:id", authenticate, requireRole(Role.ADMIN, Role.EXAM_OFFICER), destroy);

export default router;
