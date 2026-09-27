import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  submitReport,
  listSubmissionsForExam,
  reviewSubmission,
} from "@/services/submission.service";
import { AppError } from "@/middleware/errorHandler";

const submitSchema = z.object({
  allocationId: z.string().uuid(),
  papersCollected: z.number().int().nonnegative(),
  studentsPresent: z.number().int().nonnegative(),
  studentsAbsent: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

const reviewSchema = z.object({
  archive: z.boolean().optional(),
});

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const invigilatorProfileId = req.auth?.invigilatorProfileId;
    if (!invigilatorProfileId) {
      throw new AppError("This account has no invigilator profile", 403);
    }
    const input = submitSchema.parse(req.body);
    const submission = await submitReport(invigilatorProfileId, input.allocationId, {
      papersCollected: input.papersCollected,
      studentsPresent: input.studentsPresent,
      studentsAbsent: input.studentsAbsent,
      notes: input.notes,
    });
    res.status(201).json(submission);
  } catch (err) {
    next(err);
  }
}

export async function forExam(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listSubmissionsForExam(req.params.examId));
  } catch (err) {
    next(err);
  }
}

export async function review(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = req.auth?.userId;
    if (!adminUserId) throw new AppError("Not authenticated", 401);
    const { archive } = reviewSchema.parse(req.body);
    res.json(await reviewSubmission(req.params.id, adminUserId, !!archive));
  } catch (err) {
    next(err);
  }
}
