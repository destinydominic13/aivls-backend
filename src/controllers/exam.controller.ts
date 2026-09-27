import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  listExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
} from "@/services/exam.service";

const examSchema = z.object({
  courseCode: z.string().min(1),
  courseTitle: z.string().min(1),
  department: z.string().optional(),
  date: z.coerce.date(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  venueId: z.string().uuid(),
  requiredInvigilators: z.number().int().positive().optional(),
});

export async function index(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listExams());
  } catch (err) {
    next(err);
  }
}

export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getExam(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = examSchema.parse(req.body);
    res.status(201).json(await createExam(input));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = examSchema.partial().parse(req.body);
    res.json(await updateExam(req.params.id, input));
  } catch (err) {
    next(err);
  }
}

export async function destroy(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteExam(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
