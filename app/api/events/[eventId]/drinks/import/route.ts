import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const drinkRowSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  isAlcoholic: z.boolean().default(true),
});

type RouteContext = { params: Promise<{ eventId: string }> };

// POST /api/events/[eventId]/drinks/import
export async function POST(req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const drinks: Array<{
    name: string;
    category?: string;
    isAlcoholic?: boolean;
  }> = body?.drinks ?? [];

  if (!Array.isArray(drinks) || drinks.length === 0) {
    return NextResponse.json(
      { error: "Aucune boisson à importer." },
      { status: 400 },
    );
  }

  let created = 0;
  let skipped = 0;
  let linked = 0;

  for (const raw of drinks) {
    const parsed = drinkRowSchema.safeParse(raw);
    if (!parsed.success) {
      skipped++;
      continue;
    }
    const { name, category, isAlcoholic } = parsed.data;
    try {
      const normalizedName = name.trim();
      const existing = await prisma.drink.findUnique({
        where: {
          name_isAlcoholic: {
            name: normalizedName,
            isAlcoholic,
          },
        },
        select: { id: true },
      });

      const drink =
        existing ??
        (await prisma.drink.create({
          data: {
            name: normalizedName,
            category: category?.trim() || null,
            isAlcoholic,
            imageUrl: null,
          },
          select: { id: true },
        }));

      if (!existing) {
        created += 1;
      }

      const selection = await prisma.eventDrink.createMany({
        data: [{ eventId, drinkId: drink.id }],
        skipDuplicates: true,
      });

      if (selection.count > 0) {
        linked += 1;
      }

      if (existing) {
        await prisma.drink.update({
          where: { id: existing.id },
          data: {
            category: category?.trim() || null,
          },
        });
      }
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ created, linked, skipped });
}
