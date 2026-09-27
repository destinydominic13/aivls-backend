# AIVLS Backend

Express + TypeScript + PostgreSQL (Prisma) API for the Automated Invigilator
Allocation & Venue Locator System.

Covers three things beyond basic CRUD, as requested:
1. **Venue geolocation** — every venue has real lat/lng + a geofence radius.
2. **Automated attendance** — invigilator devices ping their GPS location;
   the backend auto-marks attendance once they're within range of their
   assigned venue during the exam window. No manual "check in" tap needed
   (a manual fallback exists for GPS dead zones).
3. **Unbiased allocation algorithm** — see `src/services/allocation.service.ts`
   for the full explanation. Short version: hard-excludes conflicts of
   interest / unavailability / double-booking, then ranks remaining
   candidates by *fewest total allocations so far*, breaking ties with a
   cryptographically secure random shuffle (not alphabetical/ID order).

## Setup

Requires Node 18+ and a PostgreSQL database (local, Docker, or hosted e.g.
Supabase/Neon/Railway).

```bash
cd aivls-backend
npm install
cp .env.example .env
# edit .env — at minimum set DATABASE_URL and JWT_SECRET

npx prisma generate
npx prisma migrate dev --name init

npm run seed   # optional: creates a sample admin, venue, invigilators, exam
npm run dev    # starts on http://localhost:4000
```

> This sandbox couldn't reach Prisma's binary CDN to generate the client for
> you, but the schema/code were checked field-by-field for consistency —
> `prisma generate` should run cleanly wherever you have normal internet
> access (same place you're running `npm run dev` for the frontend).

## Auth

All endpoints except `/api/auth/*` require a bearer token:

```
Authorization: Bearer <token>
```

Roles: `ADMIN`, `EXAM_OFFICER`, `INVIGILATOR`. Registering without a `role`
defaults to `INVIGILATOR` and auto-creates an invigilator profile.

```
POST /api/auth/register   { email, password, fullName, role?, department? }
POST /api/auth/login      { email, password }
```

## Venues

```
GET    /api/venues              (any authenticated user)
GET    /api/venues/:id
POST   /api/venues              (admin, exam officer)  { name, building, block?, room?, capacity, latitude, longitude, geofenceRadius? }
PATCH  /api/venues/:id          (admin, exam officer)
DELETE /api/venues/:id          (admin)
```

`geofenceRadius` is in metres and defaults to 75 — widen it for open venues
(fields, large auditoriums) where GPS accuracy is worse.

## Exams

```
GET    /api/exams
GET    /api/exams/:id
POST   /api/exams               (admin, exam officer)  { courseCode, courseTitle, department?, date, startTime, endTime, venueId, requiredInvigilators? }
PATCH  /api/exams/:id           (admin, exam officer)
DELETE /api/exams/:id           (admin, exam officer)
```

Creating an exam rejects overlapping bookings at the same venue.

## Invigilators

```
GET    /api/invigilators/me                        (invigilator — own profile)
GET    /api/invigilators                           (admin, exam officer)
GET    /api/invigilators/:id                        (admin, exam officer)
POST   /api/invigilators/:id/unavailability         { startTime, endTime, reason? }
POST   /api/invigilators/:id/conflicts              { courseCode?, department?, reason? }
PATCH  /api/invigilators/:id/availability            (admin, exam officer)  { isAvailable }
```

Unavailability windows and conflict-of-interest declarations feed directly
into the allocation algorithm's hard-exclusion step.

## Students — view papers & venue locator

```
GET    /api/students/me                             (student — own profile + enrollments)
GET    /api/students/me/exams?today=true             (student — today's paper(s) + venue)
GET    /api/students/me/exams                        (student — full upcoming schedule)
POST   /api/students/me/enrollments                  (student — self-register for a course)  { courseCode, courseTitle? }
DELETE /api/students/me/enrollments/:enrollmentId    (student)
GET    /api/students/:id                             (admin, exam officer)
POST   /api/students/:id/enrollments                 (admin, exam officer — bulk-register on a student's behalf)
```

A student's papers are matched purely by enrolled `courseCode` against the
`Exam` table — no manual linking needed. As soon as an exam officer creates
an exam for `CSC301` and a student is enrolled in `CSC301`, it shows up in
`GET /api/students/me/exams`, venue included (name, building, room,
lat/lng), so the same response powers both "what am I sitting today" and
"where do I go".

Register a student account with `role: "STUDENT"` and (optionally)
`matricNumber` / `level`:

```
POST /api/auth/register  { email, password, fullName, role: "STUDENT", matricNumber?, level? }
```

## Allocation

```
POST   /api/allocations/exams/:examId/allocate      (admin, exam officer)
PATCH  /api/allocations/:id/confirm                 (admin, exam officer)
POST   /api/allocations/exams/:examId/confirm-all   (admin, exam officer)
PATCH  /api/allocations/:id/cancel                  (admin, exam officer)
GET    /api/allocations/mine                        (invigilator)
```

`POST .../allocate` runs the fair algorithm and fills any remaining open
slots for that exam — but nothing is official yet. The algorithm's output
sits in `ASSIGNED` status until an admin/exam officer reviews and confirms
it via `PATCH .../confirm` (one allocation) or `POST .../confirm-all`
(everyone pending for that exam). Confirming sets `notifiedAt`, which is
the system's record that the invigilator has been notified of their final
duty — this is the human-in-the-loop "algorithm oversight" step.

## Incidents

```
POST   /api/incidents                    (invigilator)   { examId, type, description }
GET    /api/incidents/mine               (invigilator)
GET    /api/incidents/exams/:examId      (admin, exam officer)
```

`type` is one of `CHEATING`, `MEDICAL`, `TECHNICAL`, `OTHER`. An invigilator
can only log incidents against exams they're actually allocated to.

## Final reports (submissions)

```
POST   /api/submissions                  (invigilator)   { allocationId, papersCollected, studentsPresent, studentsAbsent, notes? }
GET    /api/submissions/exams/:examId    (admin, exam officer)
PATCH  /api/submissions/:id/review       (admin, exam officer)   { archive?: boolean }
```

Submitting a report is the invigilator's closing action for their duty —
it also flips that allocation to `COMPLETED`. Admin can mark a submission
`REVIEWED` or `ARCHIVED` (`archive: true`) once processed.

## Monitoring (real time)

There's no separate monitoring endpoint — `GET /api/exams/:id` already
returns every allocation for that exam with its live `attendance` status
(checked in or not, method, distance), and `GET /api/incidents/exams/:examId`
returns incidents as they're logged. The frontend polls both every 10s for
a live view; poll faster/slower as needed.

## Automated Attendance (location)

```
POST   /api/location/ping    (invigilator)   { latitude, longitude, accuracy? }
```

Call this from the invigilator's device every 30–60 seconds while they have
an active allocation. The response tells you whether they were just
auto-checked-in:

```json
{ "recorded": true, "autoCheckedIn": true, "distanceMeters": 42, "message": "Automatically checked in for CSC301 — 42m from venue." }
```

Manual fallback for indoor/GPS-dead venues:

```
POST /api/attendance/allocations/:allocationId/check-in   (invigilator)   { latitude?, longitude? }
GET  /api/attendance/exams/:examId                         (admin, exam officer)
```

## Frontend integration notes

- On the invigilator's dashboard, request `navigator.geolocation` permission
  and start a `setInterval` (e.g. every 45s) that calls
  `POST /api/location/ping` with `navigator.geolocation.getCurrentPosition`
  coordinates while there's an upcoming/active allocation. Stop the interval
  once `autoCheckedIn: true` comes back, or once the exam window passes.
- The "Venue Locator" section on the landing page can now show a real venue
  by fetching `GET /api/venues/:id` and rendering the lat/lng on a map.
