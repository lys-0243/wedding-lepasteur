import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireEventAccessApi } from "@/lib/permissions";

const updateGuestSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").or(z.literal("")).optional(),
  phone: z.string().optional(),
  invitationType: z.enum(["SINGLE", "COUPLE", "DUO"]),
  plusOneFirstName: z.string().optional(),
  plusOneLastName: z.string().optional(),
});

type RouteContext = { params: Promise<{ eventId: string; guestId: string }> };

function requireOwner(
  access: Awaited<ReturnType<typeof requireEventAccessApi>>,
) {
  if ("denied" in access) return access.denied;
  if (access.membership.role !== "OWNER") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }
  return null;
}

// PATCH /api/events/[eventId]/guests/[guestId] — update guest info (OWNER only)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { eventId, guestId } = await params;
  const access = await requireEventAccessApi(eventId, "guests:read");
  const denied = requireOwner(access);
  if (denied) return denied;

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, eventId },
  });
  if (!guest) {
    return NextResponse.json({ error: "Invité introuvable" }, { status: 404 });
  }

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
      plusOneFirstName:
        data.invitationType === "COUPLE" || data.invitationType === "DUO"
          ? data.plusOneFirstName?.trim() || null
          : null,
      plusOneLastName:
        data.invitationType === "COUPLE" || data.invitationType === "DUO"
          ? data.plusOneLastName?.trim() || null
          : null,
    },
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

  return NextResponse.json({
    ...updated,
    respondedAt: updated.respondedAt?.toISOString() ?? null,
    checkedInAt: updated.checkedInAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
}

// DELETE /api/events/[eventId]/guests/[guestId] — delete a guest permanently (OWNER only)
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { eventId, guestId } = await params;
  const access = await requireEventAccessApi(eventId, "guests:read");
  const denied = requireOwner(access);
  if (denied) return denied;

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, eventId },
  });
  if (!guest) {
    return NextResponse.json({ error: "Invité introuvable" }, { status: 404 });
  }

  await prisma.guest.delete({ where: { id: guestId } });

  return NextResponse.json({ success: true });
}
