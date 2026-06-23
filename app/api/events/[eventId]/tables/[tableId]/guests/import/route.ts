import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const importGuestsSchema = z.object({
  guests: z.array(
    z.object({
      firstName: z.string().min(1, "Le prénom est requis"),
      lastName: z.string().min(1, "Le nom est requis"),
      email: z.string().email("Email invalide").or(z.literal("")).optional(),
      phone: z.string().optional(),
      invitationType: z.enum(["SINGLE", "COUPLE"]),
      plusOneFirstName: z.string().optional(),
      plusOneLastName: z.string().optional(),
    })
  ),
});

type RouteContext = { params: Promise<{ eventId: string; tableId: string }> };

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
    include: { _count: { select: { guests: true } } },
  });
  if (!table) return NextResponse.json({ error: "Table introuvable" }, { status: 404 });

  const body = await req.json();
  const parsed = importGuestsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { guests } = parsed.data;

  // Check capacity limit
  const availableSlots = table.capacity - table._count.guests;
  if (guests.length > availableSlots) {
    return NextResponse.json(
      {
        error: `Impossible d'importer ${guests.length} invités. La table n'a que ${availableSlots} places libres restantes.`,
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
          plusOneFirstName: g.invitationType === "COUPLE" ? g.plusOneFirstName?.trim() || null : null,
          plusOneLastName: g.invitationType === "COUPLE" ? g.plusOneLastName?.trim() || null : null,
        },
      })
    )
  );

  const created = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ created, failed, total: guests.length });
}
