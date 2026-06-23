import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const importTablesSchema = z.object({
  tables: z.array(
    z.object({
      name: z.string().min(1, "Le nom est requis"),
      capacity: z.number().int().min(1, "La capacité doit être d'au moins 1"),
    })
  ),
});

type RouteContext = { params: Promise<{ eventId: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = importTablesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tables } = parsed.data;

  // Upsert tables (skip duplicates/update them)
  const results = await Promise.allSettled(
    tables.map((t) =>
      prisma.table.upsert({
        where: { eventId_name: { eventId, name: t.name.trim() } },
        update: { capacity: t.capacity },
        create: { eventId, name: t.name.trim(), capacity: t.capacity },
      })
    )
  );

  const created = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ created, failed, total: tables.length });
}

