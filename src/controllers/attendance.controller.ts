import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { manualCheckIn } from "@/services/geofence.service";
import { prisma } from "@/config/db";
import { AppError } from "@/middleware/errorHandler";

const manualCheckInSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export async function checkIn(req: Request, res: Response, next: NextFunction) {
  try {
    const invigilatorProfileId = req.auth?.invigilatorProfileId;
    if (!invigilatorProfileId) {
      throw new AppError("This account has no invigilator profile", 403);
    }
    const { latitude, longitude } = manualCheckInSchema.parse(req.body);
    const coords = latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined;

    const result = await manualCheckIn(req.params.allocationId, invigilatorProfileId, coords);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function forExam(req: Request, res: Response, next: NextFunction) {
  try {
    const records = await prisma.attendance.findMany({
      where: { allocation: { examId: req.params.examId } },
      include: { allocation: { include: { invigilator: { include: { user: true } } } } },
    });
    res.json(records);
  } catch (err) {
    next(err);
  }
}
