import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEventAccessApi } from "@/lib/permissions";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { eventId } = await params;
  const access = await requireEventAccessApi(eventId, "checkin:read");
  if ("denied" in access) return access.denied;

  const { searchParams } = new URL(_req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token manquant." }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({
    where: { token },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      invitationType: true,
      checkedInAt: true,
      eventId: true,
      table: { select: { name: true } },
    },
  });

  if (!guest || guest.eventId !== eventId) {
    return NextResponse.json(
      { error: "Invité introuvable pour cet événement." },
      { status: 404 },
    );
  }

  const displayName =
    guest.invitationType === "COUPLE"
      ? `Couple ${guest.firstName} ${guest.lastName}`.trim()
      : `${guest.firstName} ${guest.lastName}`.trim();

  return NextResponse.json({
    guest: {
      name: displayName,
      tableName: guest.table?.name ?? null,
      checkedInAt: guest.checkedInAt?.toISOString() ?? null,
    },
  });
}
