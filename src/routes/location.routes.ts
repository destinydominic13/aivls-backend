import { Router } from "express";
import { authenticate, requireRole } from "@/middleware/auth";
import { Role } from "@prisma/client";
import { ping } from "@/controllers/location.controller";

const router = Router();

// The invigilator's device calls this periodically (e.g. every 30-60s)
// while an assigned exam window is active. This is what drives automated
// attendance — no separate "check in" tap needed if GPS is working.
router.post("/ping", authenticate, requireRole(Role.INVIGILATOR), ping);

export default router;
