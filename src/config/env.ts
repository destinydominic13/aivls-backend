import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  // How close (metres) an invigilator must be to a venue to be auto-checked-in.
  // Falls back to each venue's own geofenceRadius if not overridden globally.
  defaultGeofenceRadiusMeters: parseInt(
    process.env.DEFAULT_GEOFENCE_RADIUS ?? "75",
    10
  ),
  // Minutes before an exam starts that a check-in ping is even considered valid.
  checkInWindowMinutesBefore: parseInt(
    process.env.CHECKIN_WINDOW_BEFORE ?? "45",
    10
  ),
  // Minutes after an exam ends that a check-in ping is still considered valid.
  checkInWindowMinutesAfter: parseInt(
    process.env.CHECKIN_WINDOW_AFTER ?? "15",
    10
  ),
};
