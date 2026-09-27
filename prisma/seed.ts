import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@aivls.edu" },
    update: {},
    create: {
      email: "admin@aivls.edu",
      passwordHash,
      fullName: "System Administrator",
      role: Role.ADMIN,
    },
  });

  const venue = await prisma.venue.create({
    data: {
      name: "Main Examination Hall",
      building: "Block A",
      block: "A",
      room: "First Floor",
      capacity: 200,
      // Example coordinates — replace with your actual campus venue coordinates.
      latitude: 6.5244,
      longitude: 3.3792,
      geofenceRadius: 100,
    },
  });

  const invigilatorNames = ["Amaka Obi", "Tunde Bello", "Chinwe Eze", "Femi Okoro"];
  const invigilators = [];
  for (const fullName of invigilatorNames) {
    const email = fullName.toLowerCase().replace(/\s+/g, ".") + "@aivls.edu";
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        fullName,
        role: Role.INVIGILATOR,
        invigilatorProfile: { create: {} },
      },
      include: { invigilatorProfile: true },
    });
    invigilators.push(user);
  }

  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hour exam

  await prisma.exam.create({
    data: {
      courseCode: "CSC301",
      courseTitle: "Data Structures & Algorithms",
      department: "Computer Science",
      date: start,
      startTime: start,
      endTime: end,
      venueId: venue.id,
      requiredInvigilators: 2,
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "student@aivls.edu" },
    update: {},
    create: {
      email: "student@aivls.edu",
      passwordHash,
      fullName: "Ada Lovelace",
      role: Role.STUDENT,
      department: "Computer Science",
      studentProfile: { create: { matricNumber: "CSC/2021/001", level: "300" } },
    },
    include: { studentProfile: true },
  });

  if (studentUser.studentProfile) {
    await prisma.enrollment.upsert({
      where: {
        studentId_courseCode: {
          studentId: studentUser.studentProfile.id,
          courseCode: "CSC301",
        },
      },
      update: {},
      create: {
        studentId: studentUser.studentProfile.id,
        courseCode: "CSC301",
        courseTitle: "Data Structures & Algorithms",
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Admin login: admin@aivls.edu / password123`);
  console.log(`Invigilator logins: <name>@aivls.edu / password123`);
  console.log(`Student login: student@aivls.edu / password123 (enrolled in CSC301)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
