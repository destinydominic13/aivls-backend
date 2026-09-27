import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  listVenues,
  getVenue,
  createVenue,
  updateVenue,
  deleteVenue,
} from "@/services/venue.service";

const venueSchema = z.object({
  name: z.string().min(2),
  building: z.string().min(1),
  block: z.string().optional(),
  room: z.string().optional(),
  capacity: z.number().int().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  geofenceRadius: z.number().int().positive().optional(),
});

export async function index(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listVenues());
  } catch (err) {
    next(err);
  }
}

export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getVenue(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = venueSchema.parse(req.body);
    res.status(201).json(await createVenue(input));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = venueSchema.partial().parse(req.body);
    res.json(await updateVenue(req.params.id, input));
  } catch (err) {
    next(err);
  }
}

export async function destroy(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteVenue(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
