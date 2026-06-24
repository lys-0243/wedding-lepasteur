import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const drinkSelectionSchema = z.object({
  primaryDrinkId: z.string().min(1),
  plusOneDrinkId: z.string().optional(),
});

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const guest = await prisma.guest.findUnique({
    where: { token },
    select: { id: true, eventId: true, invitationType: true },
  });

  if (!guest) {
    return NextResponse.json(
      { error: "Invitation introuvable." },
      { status: 404 },
    );
  }

  const body = await req.json();
  const parsed = drinkSelectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { primaryDrinkId, plusOneDrinkId } = parsed.data;

  const eventDrinks = await prisma.eventDrink.findMany({
    where: { eventId: guest.eventId },
    select: { drinkId: true },
  });

  const allowedDrinkIds = new Set(eventDrinks.map((d) => d.drinkId));
  if (!allowedDrinkIds.has(primaryDrinkId)) {
    return NextResponse.json(
      {
        error:
          "La boisson principale sélectionnée n'est pas disponible pour cet événement.",
      },
      { status: 400 },
    );
  }

  if (guest.invitationType === "COUPLE") {
    if (!plusOneDrinkId || !allowedDrinkIds.has(plusOneDrinkId)) {
      return NextResponse.json(
        { error: "La boisson accompagnateur est invalide pour cet événement." },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.guestDrink.deleteMany({ where: { guestId: guest.id } });

    await tx.guestDrink.create({
      data: {
        guestId: guest.id,
        drinkId: primaryDrinkId,
        assignedTo: "PRIMARY",
        quantity: 1,
      },
    });

    if (guest.invitationType === "COUPLE" && plusOneDrinkId) {
      await tx.guestDrink.create({
        data: {
          guestId: guest.id,
          drinkId: plusOneDrinkId,
          assignedTo: "PLUS_ONE",
          quantity: 1,
        },
      });
    }
  });

  const selections = await prisma.guestDrink.findMany({
    where: { guestId: guest.id },
    select: { drinkId: true, assignedTo: true, quantity: true },
  });

  return NextResponse.json({ selections });
}
