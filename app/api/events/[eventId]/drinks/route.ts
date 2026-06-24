import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const selectDrinksSchema = z.object({
  drinkIds: z.array(z.string().min(1)).min(1).optional(),
  drinkId: z.string().min(1).optional(),
});

type RouteContext = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/drinks — list all drinks
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const selectedDrinks = await prisma.drink.findMany({
    where: {
      eventDrinks: {
        some: { eventId },
      },
    },
    orderBy: [{ isAlcoholic: "desc" }, { name: "asc" }],
  });

  const selectedDrinkIds = selectedDrinks.map((drink) => drink.id);
  const guestDrinkRows = selectedDrinkIds.length
    ? await prisma.guestDrink.findMany({
        where: {
          drinkId: { in: selectedDrinkIds },
          guest: { eventId },
        },
        select: { drinkId: true },
      })
    : [];

  const counts = new Map<string, number>();
  for (const row of guestDrinkRows) {
    counts.set(row.drinkId, (counts.get(row.drinkId) ?? 0) + 1);
  }

  const response = selectedDrinks.map((drink) => ({
    ...drink,
    _count: { guestDrinks: counts.get(drink.id) ?? 0 },
  }));

  return NextResponse.json(response);
}

// POST /api/events/[eventId]/drinks — select existing catalog drinks for event
export async function POST(req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = selectDrinksSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const inputIds =
    parsed.data.drinkIds ?? (parsed.data.drinkId ? [parsed.data.drinkId] : []);
  const drinkIds = [...new Set(inputIds)];
  if (drinkIds.length === 0) {
    return NextResponse.json(
      { error: "Aucune boisson sélectionnée." },
      { status: 400 },
    );
  }

  const existing = await prisma.drink.findMany({
    where: { id: { in: drinkIds } },
    select: { id: true },
  });
  if (existing.length !== drinkIds.length) {
    return NextResponse.json(
      { error: "Certaines boissons sont introuvables." },
      { status: 404 },
    );
  }

  try {
    const result = await prisma.eventDrink.createMany({
      data: drinkIds.map((drinkId) => ({ eventId, drinkId })),
      skipDuplicates: true,
    });

    return NextResponse.json({ added: result.count }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible d'ajouter les boissons à l'événement.";
    console.error("Error selecting drinks:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
