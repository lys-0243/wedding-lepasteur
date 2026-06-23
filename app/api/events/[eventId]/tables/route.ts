import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createTableSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  capacity: z.number().int().min(1, "La capacité doit être au moins 1"),
});

type RouteContext = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/tables — list all tables
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tables = await prisma.table.findMany({
    where: { eventId },
    include: { _count: { select: { guests: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(tables);
}

// POST /api/events/[eventId]/tables — create a single table
export async function POST(req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createTableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, capacity } = parsed.data;

  try {
    const table = await prisma.table.create({
      data: { eventId, name, capacity },
      include: { _count: { select: { guests: true } } },
    });
    return NextResponse.json(table, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Une table avec ce nom existe déjà." },
      { status: 409 }
    );
  }
}
