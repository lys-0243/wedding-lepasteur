import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createGlobalDrinkSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis"),
  category: z.string().trim().optional(),
  isAlcoholic: z.boolean().default(true),
  imageUrl: z.string().trim().optional(),
});

export async function GET(req: NextRequest) {
  await requireUser();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const alcohol = searchParams.get("alcohol");

  const drinks = await prisma.drink.findMany({
    where: {
      ...(q
        ? {
            name: {
              contains: q,
              mode: "insensitive",
            },
          }
        : {}),
      ...(alcohol === "with"
        ? { isAlcoholic: true }
        : alcohol === "without"
          ? { isAlcoholic: false }
          : {}),
    },
    orderBy: [{ isAlcoholic: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(drinks);
}

export async function POST(req: NextRequest) {
  await requireUser();

  const body = await req.json();
  const parsed = createGlobalDrinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, category, isAlcoholic, imageUrl } = parsed.data;

  try {
    const drink = await prisma.drink.upsert({
      where: {
        name_isAlcoholic: {
          name,
          isAlcoholic,
        },
      },
      update: {
        category: category && category.length > 0 ? category : null,
        imageUrl: imageUrl && imageUrl.length > 0 ? imageUrl : null,
      },
      create: {
        name,
        category: category && category.length > 0 ? category : null,
        isAlcoholic,
        imageUrl: imageUrl && imageUrl.length > 0 ? imageUrl : null,
      },
    });

    return NextResponse.json(drink, { status: 201 });
  } catch (error) {
    console.error("Error creating global drink:", error);
    return NextResponse.json(
      { error: "Impossible de créer la boisson." },
      { status: 500 },
    );
  }
}
