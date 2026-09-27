import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { recordLocationPing } from "@/services/geofence.service";
import { AppError } from "@/middleware/errorHandler";

const pingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
});

export async function ping(req: Request, res: Response, next: NextFunction) {
  try {
    const invigilatorProfileId = req.auth?.invigilatorProfileId;
    if (!invigilatorProfileId) {
      throw new AppError("This account has no invigilator profile", 403);
    }

    const input = pingSchema.parse(req.body);
    const result = await recordLocationPing({
      invigilatorId: invigilatorProfileId,
      ...input,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
