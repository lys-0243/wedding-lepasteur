import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ eventId: string; tableId: string; guestId: string }> };

// DELETE /api/events/[eventId]/tables/[tableId]/guests/[guestId] - Delete guest entirely
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId, tableId, guestId } = await params;

  // Verify access
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify guest matches table and event
  const guest = await prisma.guest.findFirst({
    where: { id: guestId, tableId, eventId },
  });
  if (!guest) return NextResponse.json({ error: "Invité introuvable" }, { status: 404 });

  await prisma.guest.delete({ where: { id: guestId } });

  return NextResponse.json({ success: true });
}

// PATCH /api/events/[eventId]/tables/[tableId]/guests/[guestId] - Update guest or unassign
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId, tableId, guestId } = await params;

  // Verify access
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify guest matches table and event
  const guest = await prisma.guest.findFirst({
    where: { id: guestId, tableId, eventId },
  });
  if (!guest) return NextResponse.json({ error: "Invité introuvable" }, { status: 404 });

  const body = await req.json();
  const { action, firstName, lastName, email, phone, invitationType, plusOneFirstName, plusOneLastName } = body;

  if (action === "unassign") {
    // Unassign from table
    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: { tableId: null },
    });
    return NextResponse.json(updated);
  }

  // Update guest details
  const updated = await prisma.guest.update({
    where: { id: guestId },
    data: {
      ...(firstName !== undefined && { firstName: String(firstName).trim() }),
      ...(lastName !== undefined && { lastName: String(lastName).trim() }),
      ...(email !== undefined && { email: email ? String(email).trim() : null }),
      ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
      ...(invitationType !== undefined && { invitationType }),
      ...(plusOneFirstName !== undefined && { plusOneFirstName: plusOneFirstName ? String(plusOneFirstName).trim() : null }),
      ...(plusOneLastName !== undefined && { plusOneLastName: plusOneLastName ? String(plusOneLastName).trim() : null }),
    },
  });

  return NextResponse.json(updated);
}
