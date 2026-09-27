import bcrypt from "bcryptjs";
import { prisma } from "@/config/db";
import { signToken } from "@/utils/jwt";
import { AppError } from "@/middleware/errorHandler";
import { Role } from "@prisma/client";

const SALT_ROUNDS = 12;

interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  role?: Role;
  department?: string;
  matricNumber?: string;
  level?: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError("An account with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const role = input.role ?? Role.INVIGILATOR;

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role,
      department: input.department,
      // Every invigilator/student gets a profile immediately so downstream
      // queries never have to special-case a missing profile.
      invigilatorProfile: role === Role.INVIGILATOR ? { create: {} } : undefined,
      studentProfile:
        role === Role.STUDENT
          ? { create: { matricNumber: input.matricNumber, level: input.level } }
          : undefined,
    },
    include: { invigilatorProfile: true, studentProfile: true },
  });

  const token = signToken({
    userId: user.id,
    role: user.role,
    invigilatorProfileId: user.invigilatorProfile?.id,
    studentProfileId: user.studentProfile?.id,
  });

  return { user: sanitizeUser(user), token };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { invigilatorProfile: true, studentProfile: true },
  });

  if (!user || !user.isActive) {
    throw new AppError("Invalid credentials", 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    invigilatorProfileId: user.invigilatorProfile?.id,
    studentProfileId: user.studentProfile?.id,
  });

  return { user: sanitizeUser(user), token };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeUser(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}
