import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ eventId: string; drinkId: string }> };

// DELETE /api/events/[eventId]/drinks/[drinkId] — remove drink from event selection
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId, drinkId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const selection = await prisma.eventDrink.findFirst({
    where: { eventId, drinkId },
    select: { id: true },
  });
  if (!selection)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.guestDrink.deleteMany({
      where: {
        drinkId,
        guest: { eventId },
      },
    }),
    prisma.eventDrink.delete({ where: { id: selection.id } }),
  ]);

  return NextResponse.json({ success: true });
}
