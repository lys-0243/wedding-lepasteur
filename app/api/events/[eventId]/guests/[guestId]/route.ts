import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateGuestSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").or(z.literal("")).optional(),
  phone: z.string().optional(),
  invitationType: z.enum(["SINGLE", "COUPLE"]),
  plusOneFirstName: z.string().optional(),
  plusOneLastName: z.string().optional(),
});

type RouteContext = { params: Promise<{ eventId: string; guestId: string }> };

// PATCH /api/events/[eventId]/guests/[guestId] — update guest info
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId, guestId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, eventId },
  });
  if (!guest) return NextResponse.json({ error: "Invité introuvable" }, { status: 404 });

  const body = await req.json();
  const parsed = updateGuestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const emailVal = data.email ? data.email.trim() : null;

  const updated = await prisma.guest.update({
    where: { id: guestId },
    data: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: emailVal,
      phone: data.phone?.trim() || null,
      invitationType: data.invitationType,
      plusOneFirstName: data.invitationType === "COUPLE" ? data.plusOneFirstName?.trim() || null : null,
      plusOneLastName: data.invitationType === "COUPLE" ? data.plusOneLastName?.trim() || null : null,
    },
    select: {
      id: true,
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
      createdAt: true,
      table: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/events/[eventId]/guests/[guestId] — delete a guest permanently
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId, guestId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, eventId },
  });
  if (!guest) return NextResponse.json({ error: "Invité introuvable" }, { status: 404 });

  await prisma.guest.delete({ where: { id: guestId } });

  return NextResponse.json({ success: true });
}
