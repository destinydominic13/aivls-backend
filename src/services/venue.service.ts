import { prisma } from "@/config/db";
import { AppError } from "@/middleware/errorHandler";

interface VenueInput {
  name: string;
  building: string;
  block?: string;
  room?: string;
  capacity: number;
  latitude: number;
  longitude: number;
  geofenceRadius?: number;
}

export function listVenues() {
  return prisma.venue.findMany({ orderBy: { name: "asc" } });
}

export async function getVenue(id: string) {
  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) throw new AppError("Venue not found", 404);
  return venue;
}

export function createVenue(input: VenueInput) {
  return prisma.venue.create({ data: input });
}

export async function updateVenue(id: string, input: Partial<VenueInput>) {
  await getVenue(id);
  return prisma.venue.update({ where: { id }, data: input });
}

export async function deleteVenue(id: string) {
  await getVenue(id);
  return prisma.venue.delete({ where: { id } });
}
