import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEventAccessApi } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const createGuestSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").or(z.literal("")).optional(),
  phone: z.string().optional(),
  invitationType: z.enum(["SINGLE", "COUPLE", "DUO"]),
  plusOneFirstName: z.string().optional(),
  plusOneLastName: z.string().optional(),
});

type RouteContext = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/guests — list all guests ordered by createdAt
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { eventId } = await params;
  const access = await requireEventAccessApi(eventId, "guests:read");
  if ("denied" in access) return access.denied;

  const { searchParams } = new URL(req.url);
  const unassignedOnly = searchParams.get("unassigned") === "true";

  const guests = await prisma.guest.findMany({
    where: {
      eventId,
      ...(unassignedOnly && { tableId: null }),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      token: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      invitationType: true,
      plusOneFirstName: true,
      plusOneLastName: true,
      rsvpStatus: true,
      plusOneRsvpStatus: true,
      respondedAt: true,
      checkedInAt: true,
      createdAt: true,
      table: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    guests.map((g) => ({
      ...g,
      respondedAt: g.respondedAt?.toISOString() ?? null,
      checkedInAt: g.checkedInAt?.toISOString() ?? null,
      createdAt: g.createdAt.toISOString(),
    })),
  );
}

// POST /api/events/[eventId]/guests — create a guest at the event level (unassigned to a table)
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { eventId } = await params;
  const access = await requireEventAccessApi(eventId, "guests:write");
  if ("denied" in access) return access.denied;

  const body = await req.json();
  const parsed = createGuestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const emailVal = data.email ? data.email.trim() : null;

  const guest = await prisma.guest.create({
    data: {
      eventId,
      tableId: null,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: emailVal,
      phone: data.phone?.trim() || null,
      invitationType: data.invitationType,
      plusOneFirstName:
        data.invitationType === "COUPLE" || data.invitationType === "DUO"
          ? data.plusOneFirstName?.trim() || null
          : null,
      plusOneLastName:
        data.invitationType === "COUPLE" || data.invitationType === "DUO"
          ? data.plusOneLastName?.trim() || null
          : null,
    },
  });

  return NextResponse.json(guest, { status: 201 });
}
