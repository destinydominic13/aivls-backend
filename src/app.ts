import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "@/config/env";
import { errorHandler, notFound } from "@/middleware/errorHandler";

import authRoutes from "@/routes/auth.routes";
import venueRoutes from "@/routes/venue.routes";
import examRoutes from "@/routes/exam.routes";
import invigilatorRoutes from "@/routes/invigilator.routes";
import studentRoutes from "@/routes/student.routes";
import allocationRoutes from "@/routes/allocation.routes";
import attendanceRoutes from "@/routes/attendance.routes";
import locationRoutes from "@/routes/location.routes";
import incidentRoutes from "@/routes/incident.routes";
import submissionRoutes from "@/routes/submission.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

// Generous overall limit, with a tighter one on auth to slow down credential
// stuffing / brute force attempts.
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/invigilators", invigilatorRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/submissions", submissionRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
