import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { IncidentType } from "@prisma/client";
import {
  reportIncident,
  listIncidentsForExam,
  listIncidentsReportedBy,
} from "@/services/incident.service";
import { AppError } from "@/middleware/errorHandler";

const reportSchema = z.object({
  examId: z.string().uuid(),
  type: z.nativeEnum(IncidentType),
  description: z.string().min(1),
});

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const invigilatorProfileId = req.auth?.invigilatorProfileId;
    if (!invigilatorProfileId) {
      throw new AppError("This account has no invigilator profile", 403);
    }
    const input = reportSchema.parse(req.body);
    const incident = await reportIncident(
      invigilatorProfileId,
      input.examId,
      input.type,
      input.description
    );
    res.status(201).json(incident);
  } catch (err) {
    next(err);
  }
}

export async function forExam(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listIncidentsForExam(req.params.examId));
  } catch (err) {
    next(err);
  }
}

export async function mine(req: Request, res: Response, next: NextFunction) {
  try {
    const invigilatorProfileId = req.auth?.invigilatorProfileId;
    if (!invigilatorProfileId) {
      throw new AppError("This account has no invigilator profile", 403);
    }
    res.json(await listIncidentsReportedBy(invigilatorProfileId));
  } catch (err) {
    next(err);
  }
}
