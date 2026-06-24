import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { token } = await params;

  const guest = await prisma.guest.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      firstName: true,
      lastName: true,
      invitationType: true,
      plusOneFirstName: true,
      plusOneLastName: true,
      rsvpStatus: true,
      plusOneRsvpStatus: true,
      respondedAt: true,
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          eventDate: true,
          venue: true,
          profileImageUrl: true,
          coverImageUrl: true,
        },
      },
    },
  });

  if (!guest) {
    return NextResponse.json(
      { error: "Invitation introuvable." },
      { status: 404 },
    );
  }

  const eventDrinkLinks = await prisma.eventDrink.findMany({
    where: { eventId: guest.event.id },
    include: {
      drink: {
        select: {
          id: true,
          name: true,
          category: true,
          isAlcoholic: true,
          imageUrl: true,
        },
      },
    },
    orderBy: [{ drink: { isAlcoholic: "desc" } }, { drink: { name: "asc" } }],
  });

  const selections = await prisma.guestDrink.findMany({
    where: { guestId: guest.id },
    select: {
      drinkId: true,
      assignedTo: true,
      quantity: true,
    },
  });

  return NextResponse.json({
    guest: {
      ...guest,
      respondedAt: guest.respondedAt?.toISOString() ?? null,
      event: {
        ...guest.event,
        eventDate: guest.event.eventDate?.toISOString() ?? null,
      },
    },
    drinks: eventDrinkLinks.map((row) => row.drink),
    selections,
  });
}
