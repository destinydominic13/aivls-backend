import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { Role } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  role: Role;
  invigilatorProfileId?: string;
  studentProfileId?: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
