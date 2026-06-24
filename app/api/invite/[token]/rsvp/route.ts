import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const rsvpSchema = z.object({
  rsvpStatus: z.enum(["PENDING", "CONFIRMED", "DECLINED"]),
  plusOneRsvpStatus: z
    .enum(["PENDING", "CONFIRMED", "DECLINED"])
    .nullable()
    .optional(),
  rsvpMessage: z.string().trim().max(500).optional(),
});

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const guest = await prisma.guest.findUnique({
    where: { token },
    select: { id: true, invitationType: true },
  });

  if (!guest) {
    return NextResponse.json(
      { error: "Invitation introuvable." },
      { status: 404 },
    );
  }

  const body = await req.json();
  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const plusOneStatus =
    guest.invitationType === "COUPLE"
      ? (payload.plusOneRsvpStatus ?? "PENDING")
      : null;

  const updated = await prisma.guest.update({
    where: { id: guest.id },
    data: {
      rsvpStatus: payload.rsvpStatus,
      plusOneRsvpStatus: plusOneStatus,
      rsvpMessage: payload.rsvpMessage || null,
      respondedAt: new Date(),
    },
    select: {
      id: true,
      rsvpStatus: true,
      plusOneRsvpStatus: true,
      rsvpMessage: true,
      respondedAt: true,
    },
  });

  return NextResponse.json({
    ...updated,
    respondedAt: updated.respondedAt?.toISOString() ?? null,
  });
}
