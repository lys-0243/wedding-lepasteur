import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEventAccessApi } from "@/lib/permissions";

type RouteContext = {
  params: Promise<{ eventId: string; tableId: string; guestId: string }>;
};

function requireOwner(
  access: Awaited<ReturnType<typeof requireEventAccessApi>>,
) {
  if ("denied" in access) return access.denied;
  if (access.membership.role !== "OWNER") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }
  return null;
}

// DELETE — delete guest entirely (OWNER only)
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { eventId, tableId, guestId } = await params;
  const access = await requireEventAccessApi(eventId, "guests:read");
  const denied = requireOwner(access);
  if (denied) return denied;

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, tableId, eventId },
  });
  if (!guest) {
    return NextResponse.json({ error: "Invité introuvable" }, { status: 404 });
  }

  await prisma.guest.delete({ where: { id: guestId } });

  return NextResponse.json({ success: true });
}

// PATCH — update guest details (OWNER) or unassign (tables:write)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { eventId, tableId, guestId } = await params;
  const body = await req.json();
  const {
    action,
    firstName,
    lastName,
    email,
    phone,
    invitationType,
    plusOneFirstName,
    plusOneLastName,
  } = body;

  if (action === "unassign") {
    const access = await requireEventAccessApi(eventId, "guests:write");
    if ("denied" in access) return access.denied;

    const guest = await prisma.guest.findFirst({
      where: { id: guestId, tableId, eventId },
    });
    if (!guest) {
      return NextResponse.json({ error: "Invité introuvable" }, { status: 404 });
    }

    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: { tableId: null },
    });
    return NextResponse.json(updated);
  }

  const access = await requireEventAccessApi(eventId, "guests:read");
  const denied = requireOwner(access);
  if (denied) return denied;

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, tableId, eventId },
  });
  if (!guest) {
    return NextResponse.json({ error: "Invité introuvable" }, { status: 404 });
  }

  const updated = await prisma.guest.update({
    where: { id: guestId },
    data: {
      ...(firstName !== undefined && { firstName: String(firstName).trim() }),
      ...(lastName !== undefined && { lastName: String(lastName).trim() }),
      ...(email !== undefined && {
        email: email ? String(email).trim() : null,
      }),
      ...(phone !== undefined && {
        phone: phone ? String(phone).trim() : null,
      }),
      ...(invitationType !== undefined && { invitationType }),
      ...(plusOneFirstName !== undefined && {
        plusOneFirstName: plusOneFirstName
          ? String(plusOneFirstName).trim()
          : null,
      }),
      ...(plusOneLastName !== undefined && {
        plusOneLastName: plusOneLastName
          ? String(plusOneLastName).trim()
          : null,
      }),
    },
  });

  return NextResponse.json(updated);
}
