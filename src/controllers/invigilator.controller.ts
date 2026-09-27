import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  listInvigilators,
  getInvigilator,
  addAvailabilityWindow,
  addConflict,
  setAvailabilityFlag,
} from "@/services/invigilator.service";
import { AppError } from "@/middleware/errorHandler";

const availabilitySchema = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  reason: z.string().optional(),
});

const conflictSchema = z.object({
  courseCode: z.string().optional(),
  department: z.string().optional(),
  reason: z.string().optional(),
});

const flagSchema = z.object({ isAvailable: z.boolean() });

export async function index(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listInvigilators());
  } catch (err) {
    next(err);
  }
}

export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getInvigilator(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function addUnavailability(req: Request, res: Response, next: NextFunction) {
  try {
    const input = availabilitySchema.parse(req.body);
    res.status(201).json(
      await addAvailabilityWindow(req.params.id, input.startTime, input.endTime, input.reason)
    );
  } catch (err) {
    next(err);
  }
}

export async function addConflictOfInterest(req: Request, res: Response, next: NextFunction) {
  try {
    const input = conflictSchema.parse(req.body);
    res.status(201).json(await addConflict(req.params.id, input));
  } catch (err) {
    next(err);
  }
}

export async function toggleAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const { isAvailable } = flagSchema.parse(req.body);
    res.json(await setAvailabilityFlag(req.params.id, isAvailable));
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const invigilatorProfileId = req.auth?.invigilatorProfileId;
    if (!invigilatorProfileId) {
      throw new AppError("This account has no invigilator profile", 403);
    }
    res.json(await getInvigilator(invigilatorProfileId));
  } catch (err) {
    next(err);
  }
}
