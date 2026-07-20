import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireEventAccessApi } from "@/lib/permissions";

const importGuestsSchema = z.object({
  guests: z.array(
    z.object({
      firstName: z.string().min(1, "Le prénom est requis"),
      lastName: z.string().min(1, "Le nom est requis"),
      email: z.string().email("Email invalide").or(z.literal("")).optional(),
      phone: z.string().optional(),
      invitationType: z.enum(["SINGLE", "COUPLE", "DUO"]),
      plusOneFirstName: z.string().optional(),
      plusOneLastName: z.string().optional(),
    })
  ),
});

type RouteContext = { params: Promise<{ eventId: string; tableId: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { eventId, tableId } = await params;
  const access = await requireEventAccessApi(eventId, "guests:write");
  if ("denied" in access) return access.denied;

  // Verify table
  const table = await prisma.table.findFirst({
    where: { id: tableId, eventId },
    include: { guests: { select: { invitationType: true } } },
  });
  if (!table) return NextResponse.json({ error: "Table introuvable" }, { status: 404 });

  const body = await req.json();
  const parsed = importGuestsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { guests } = parsed.data;

  // Check capacity limit — couples count as 2 seats
  const occupiedSeats = table.guests.reduce(
    (sum, g) => sum + (g.invitationType === "COUPLE" || g.invitationType === "DUO" ? 2 : 1),
    0
  );
  const incomingSeats = guests.reduce(
    (sum, g) => sum + (g.invitationType === "COUPLE" || g.invitationType === "DUO" ? 2 : 1),
    0
  );
  const availableSlots = table.capacity - occupiedSeats;

  if (incomingSeats > availableSlots) {
    return NextResponse.json(
      {
        error: `Impossible d'importer ces invités : ${incomingSeats} place(s) requises, seulement ${availableSlots} disponible(s).`,
      },
      { status: 400 }
    );
  }

  // Import guests
  const results = await Promise.allSettled(
    guests.map((g) =>
      prisma.guest.create({
        data: {
          eventId,
          tableId,
          firstName: g.firstName.trim(),
          lastName: g.lastName.trim(),
          email: g.email?.trim() || null,
          phone: g.phone?.trim() || null,
          invitationType: g.invitationType,
          plusOneFirstName: g.invitationType === "COUPLE" || g.invitationType === "DUO" ? g.plusOneFirstName?.trim() || null : null,
          plusOneLastName: g.invitationType === "COUPLE" || g.invitationType === "DUO" ? g.plusOneLastName?.trim() || null : null,
        },
      })
    )
  );

  const created = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ created, failed, total: guests.length });
}
