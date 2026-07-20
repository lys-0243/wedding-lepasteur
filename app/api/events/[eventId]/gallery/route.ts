import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ eventId: string }> };

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: {
      id: true,
      slug: true,
      title: true,
      galleryEnabled: true,
      galleryPin: true,
      mediaLinks: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          uploaderName: true,
          url: true,
          publicId: true,
          resourceType: true,
          createdAt: true,
        },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    slug: event.slug,
    title: event.title,
    galleryEnabled: event.galleryEnabled,
    galleryPin: event.galleryPin,
    links: event.mediaLinks.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    galleryEnabled?: boolean;
    galleryPin?: string;
    regeneratePin?: boolean;
  };

  const data: { galleryEnabled?: boolean; galleryPin?: string } = {};

  if (typeof body.galleryEnabled === "boolean") {
    data.galleryEnabled = body.galleryEnabled;
    if (body.galleryEnabled) {
      const current = await prisma.event.findUnique({
        where: { id: eventId },
        select: { galleryPin: true },
      });
      if (!current?.galleryPin && !data.galleryPin) {
        data.galleryPin = generatePin();
      }
    }
  }

  if (body.regeneratePin) {
    data.galleryPin = generatePin();
  } else if (typeof body.galleryPin === "string") {
    const pin = body.galleryPin.trim();
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { error: "Le PIN doit contenir 4 à 6 chiffres." },
        { status: 400 },
      );
    }
    data.galleryPin = pin;
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data,
    select: {
      galleryEnabled: true,
      galleryPin: true,
      slug: true,
    },
  });

  return NextResponse.json(updated);
}
