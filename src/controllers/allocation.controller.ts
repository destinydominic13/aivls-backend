import { Request, Response, NextFunction } from "express";
import {
  allocateInvigilatorsForExam,
  cancelAllocation,
  confirmAllocation,
  confirmAllocationsForExam,
  listAllocationsForInvigilator,
} from "@/services/allocation.service";
import { AppError } from "@/middleware/errorHandler";

export async function runAllocation(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await allocateInvigilatorsForExam(req.params.examId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await cancelAllocation(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await confirmAllocation(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function confirmAllForExam(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await confirmAllocationsForExam(req.params.examId));
  } catch (err) {
    next(err);
  }
}

export async function myAllocations(req: Request, res: Response, next: NextFunction) {
  try {
    const invigilatorProfileId = req.auth?.invigilatorProfileId;
    if (!invigilatorProfileId) {
      throw new AppError("This account has no invigilator profile", 403);
    }
    res.json(await listAllocationsForInvigilator(invigilatorProfileId));
  } catch (err) {
    next(err);
  }
}
