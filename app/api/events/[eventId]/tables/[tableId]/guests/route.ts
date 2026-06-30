import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
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

type RouteContext = { params: Promise<{ eventId: string; tableId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId, tableId } = await params;

  // Verify access
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const table = await prisma.table.findFirst({
    where: { id: tableId, eventId },
  });
  if (!table) return NextResponse.json({ error: "Table introuvable" }, { status: 404 });

  const guests = await prisma.guest.findMany({
    where: { eventId, tableId },
    orderBy: { lastName: "asc" },
  });

  return NextResponse.json(guests);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId, tableId } = await params;

  // Verify access
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify table
  const table = await prisma.table.findFirst({
    where: { id: tableId, eventId },
    include: { guests: { select: { invitationType: true } } },
  });
  if (!table) return NextResponse.json({ error: "Table introuvable" }, { status: 404 });

  // Check capacity (couples count as 2 seats)
  const body = await req.json();

  if (body.guestId) {
    const guest = await prisma.guest.findFirst({
      where: { id: body.guestId, eventId },
    });
    if (!guest) return NextResponse.json({ error: "Invité introuvable" }, { status: 404 });

    const occupiedSeats = table.guests.reduce(
      (sum, g) => sum + (g.invitationType === "COUPLE" || g.invitationType === "DUO" ? 2 : 1),
      0
    );
    const guestSeats = guest.invitationType === "COUPLE" || guest.invitationType === "DUO" ? 2 : 1;

    if (occupiedSeats + guestSeats > table.capacity) {
      return NextResponse.json(
        { error: `Cette table n'a plus assez de places. Places libres : ${table.capacity - occupiedSeats}.` },
        { status: 400 }
      );
    }

    const updatedGuest = await prisma.guest.update({
      where: { id: guest.id },
      data: { tableId },
    });

    return NextResponse.json(updatedGuest);
  }

  const parsed = createGuestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const occupiedSeats = table.guests.reduce(
    (sum, g) => sum + (g.invitationType === "COUPLE" || g.invitationType === "DUO" ? 2 : 1),
    0
  );
  const newGuestSeats = parsed.data.invitationType === "COUPLE" || parsed.data.invitationType === "DUO" ? 2 : 1;

  if (occupiedSeats + newGuestSeats > table.capacity) {
    return NextResponse.json(
      { error: `Cette table n'a plus assez de places. Places libres : ${table.capacity - occupiedSeats}.` },
      { status: 400 }
    );
  }


  const data = parsed.data;

  // Email format clean
  const emailVal = data.email ? data.email.trim() : null;

  const guest = await prisma.guest.create({
    data: {
      eventId,
      tableId,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: emailVal,
      phone: data.phone?.trim() || null,
      invitationType: data.invitationType,
      plusOneFirstName: data.invitationType === "COUPLE" || data.invitationType === "DUO" ? data.plusOneFirstName?.trim() || null : null,
      plusOneLastName: data.invitationType === "COUPLE" || data.invitationType === "DUO" ? data.plusOneLastName?.trim() || null : null,
    },
  });

  return NextResponse.json(guest, { status: 201 });
}
