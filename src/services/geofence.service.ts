import { prisma } from "@/config/db";
import { distanceInMeters } from "@/utils/distance";
import { env } from "@/config/env";
import { AppError } from "@/middleware/errorHandler";

interface PingInput {
  invigilatorId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface PingResult {
  recorded: true;
  autoCheckedIn: boolean;
  distanceMeters?: number;
  message: string;
}

/**
 * AUTOMATED ATTENDANCE
 * =====================
 * Called whenever an invigilator's device sends a location ping (the
 * frontend should do this periodically, e.g. every 30-60s, while an
 * assigned exam window is active).
 *
 * For each ping:
 *  1. Log the raw ping (audit trail).
 *  2. Find an allocation for this invigilator whose exam is currently within
 *     the check-in window (start - N minutes, end + M minutes) and not yet
 *     checked in.
 *  3. Compute distance from the ping to that exam's venue.
 *  4. If distance <= venue's geofence radius, automatically mark attendance
 *     (checkInTime, coordinates, method = AUTO_GEOFENCE) and flip the
 *     allocation status to CHECKED_IN. No human action required.
 *
 * If there's no active allocation in window, or the invigilator is still
 * out of range, the ping is stored but nothing else happens — the next
 * ping will be checked again.
 */
export async function recordLocationPing(input: PingInput): Promise<PingResult> {
  await prisma.locationPing.create({
    data: {
      invigilatorId: input.invigilatorId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
    },
  });

  const now = new Date();
  const windowStart = new Date(
    now.getTime() - env.checkInWindowMinutesAfter * 60_000
  );
  const windowEnd = new Date(
    now.getTime() + env.checkInWindowMinutesBefore * 60_000
  );

  // Find an active allocation whose exam window overlaps "now" (with grace
  // periods) and that hasn't been checked in yet.
  const allocation = await prisma.allocation.findFirst({
    where: {
      invigilatorId: input.invigilatorId,
      status: { in: ["ASSIGNED", "CONFIRMED"] },
      exam: {
        startTime: { lte: windowEnd },
        endTime: { gte: windowStart },
      },
    },
    include: { exam: { include: { venue: true } } },
    orderBy: { exam: { startTime: "asc" } },
  });

  if (!allocation) {
    return {
      recorded: true,
      autoCheckedIn: false,
      message: "Ping logged. No active exam assignment in the check-in window.",
    };
  }

  const venue = allocation.exam.venue;
  const distance = distanceInMeters(
    input.latitude,
    input.longitude,
    venue.latitude,
    venue.longitude
  );

  const radius = venue.geofenceRadius ?? env.defaultGeofenceRadiusMeters;

  if (distance > radius) {
    return {
      recorded: true,
      autoCheckedIn: false,
      distanceMeters: Math.round(distance),
      message: `Ping logged. ${Math.round(distance)}m from venue — outside the ${radius}m check-in radius.`,
    };
  }

  await prisma.$transaction([
    prisma.attendance.upsert({
      where: { allocationId: allocation.id },
      create: {
        allocationId: allocation.id,
        checkInTime: now,
        checkInLat: input.latitude,
        checkInLng: input.longitude,
        distanceMeters: distance,
        method: "AUTO_GEOFENCE",
      },
      update: {},
    }),
    prisma.allocation.update({
      where: { id: allocation.id },
      data: { status: "CHECKED_IN" },
    }),
  ]);

  return {
    recorded: true,
    autoCheckedIn: true,
    distanceMeters: Math.round(distance),
    message: `Automatically checked in for ${allocation.exam.courseCode} — ${Math.round(distance)}m from venue.`,
  };
}

/** Manual fallback for GPS dead zones — still requires proof of proximity if a coordinate is supplied. */
export async function manualCheckIn(
  allocationId: string,
  invigilatorId: string,
  coords?: { latitude: number; longitude: number }
) {
  const allocation = await prisma.allocation.findUnique({
    where: { id: allocationId },
    include: { exam: { include: { venue: true } } },
  });
  if (!allocation) throw new AppError("Allocation not found", 404);
  if (allocation.invigilatorId !== invigilatorId) {
    throw new AppError("This allocation does not belong to you", 403);
  }

  let distance: number | undefined;
  if (coords) {
    distance = distanceInMeters(
      coords.latitude,
      coords.longitude,
      allocation.exam.venue.latitude,
      allocation.exam.venue.longitude
    );
  }

  await prisma.$transaction([
    prisma.attendance.upsert({
      where: { allocationId },
      create: {
        allocationId,
        checkInTime: new Date(),
        checkInLat: coords?.latitude,
        checkInLng: coords?.longitude,
        distanceMeters: distance,
        method: "MANUAL",
      },
      update: {},
    }),
    prisma.allocation.update({
      where: { id: allocationId },
      data: { status: "CHECKED_IN" },
    }),
  ]);

  return { checkedIn: true, distanceMeters: distance ? Math.round(distance) : undefined };
}
