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
      tableName: z.string().optional(),
    })
  ),
});

type RouteContext = { params: Promise<{ eventId: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId } = await params;

  // Verify access
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = importGuestsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { guests } = parsed.data;

  // Resolve tables first (avoid race conditions in concurrent prisma.table.create)
  const tableCache = new Map<string, string>(); // tableName (lowercase) -> tableId
  const uniqueTableNames = Array.from(
    new Set(
      guests
        .map((g) => g.tableName?.trim())
        .filter((name): name is string => !!name)
    )
  );

  for (const tableName of uniqueTableNames) {
    let table = await prisma.table.findFirst({
      where: {
        eventId,
        name: { equals: tableName, mode: "insensitive" },
      },
    });

    if (!table) {
      table = await prisma.table.create({
        data: {
          eventId,
          name: tableName,
          capacity: 10, // default capacity
        },
      });
    }

    tableCache.set(tableName.toLowerCase(), table.id);
  }

  // Import guests
  const results = await Promise.allSettled(
    guests.map((g) => {
      const matchedTableId = g.tableName
        ? tableCache.get(g.tableName.trim().toLowerCase()) || null
        : null;

      return prisma.guest.create({
        data: {
          eventId,
          tableId: matchedTableId,
          firstName: g.firstName.trim(),
          lastName: g.lastName.trim(),
          email: g.email?.trim() || null,
          phone: g.phone?.trim() || null,
          invitationType: g.invitationType,
          plusOneFirstName: g.invitationType === "COUPLE" ? g.plusOneFirstName?.trim() || null : null,
          plusOneLastName: g.invitationType === "COUPLE" ? g.plusOneLastName?.trim() || null : null,
        },
      });
    })
  );

  const created = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ created, failed, total: guests.length });
}
