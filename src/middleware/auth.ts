import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "@/utils/jwt";
import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed authorization header" });
  }

  const token = header.slice("Bearer ".length);

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Restrict a route to one or more roles. Use after `authenticate`. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
