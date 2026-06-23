import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ eventId: string; tableId: string }> };

// DELETE /api/events/[eventId]/tables/[tableId]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId, tableId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const table = await prisma.table.findFirst({
    where: { id: tableId, eventId },
  });
  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.table.delete({ where: { id: tableId } });

  return NextResponse.json({ success: true });
}

// PATCH /api/events/[eventId]/tables/[tableId]
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId, tableId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, capacity } = body as { name?: string; capacity?: number };

  try {
    const table = await prisma.table.update({
      where: { id: tableId },
      data: {
        ...(name !== undefined && { name }),
        ...(capacity !== undefined && { capacity }),
      },
      include: { _count: { select: { guests: true } } },
    });
    return NextResponse.json(table);
  } catch {
    return NextResponse.json(
      { error: "Une table avec ce nom existe déjà." },
      { status: 409 }
    );
  }
}
