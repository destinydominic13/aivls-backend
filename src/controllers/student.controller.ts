import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  getStudentProfile,
  addEnrollment,
  removeEnrollment,
  listExamsForStudent,
} from "@/services/student.service";
import { AppError } from "@/middleware/errorHandler";

const enrollmentSchema = z.object({
  courseCode: z.string().min(1),
  courseTitle: z.string().optional(),
});

function studentProfileIdOrThrow(req: Request): string {
  const id = req.auth?.studentProfileId;
  if (!id) throw new AppError("This account has no student profile", 403);
  return id;
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getStudentProfile(studentProfileIdOrThrow(req)));
  } catch (err) {
    next(err);
  }
}

export async function myExams(req: Request, res: Response, next: NextFunction) {
  try {
    const todayOnly = req.query.today === "true";
    res.json(await listExamsForStudent(studentProfileIdOrThrow(req), todayOnly));
  } catch (err) {
    next(err);
  }
}

export async function enroll(req: Request, res: Response, next: NextFunction) {
  try {
    const input = enrollmentSchema.parse(req.body);
    const studentId = studentProfileIdOrThrow(req);
    res.status(201).json(await addEnrollment(studentId, input.courseCode, input.courseTitle));
  } catch (err) {
    next(err);
  }
}

export async function unenroll(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = studentProfileIdOrThrow(req);
    await removeEnrollment(studentId, req.params.enrollmentId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Admin / exam officer managing enrollments on a student's behalf
// (e.g. bulk-registering a class), by student profile id.
export async function enrollFor(req: Request, res: Response, next: NextFunction) {
  try {
    const input = enrollmentSchema.parse(req.body);
    res
      .status(201)
      .json(await addEnrollment(req.params.id, input.courseCode, input.courseTitle));
  } catch (err) {
    next(err);
  }
}

export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getStudentProfile(req.params.id));
  } catch (err) {
    next(err);
  }
}
