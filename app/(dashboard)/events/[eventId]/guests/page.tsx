import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GuestsClient } from "@/components/guests/guests-client";

export const dynamic = "force-dynamic";

type GuestsPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function GuestsPage({ params }: GuestsPageProps) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) notFound();

  const guests = await prisma.guest.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      invitationType: true,
      plusOneFirstName: true,
      plusOneLastName: true,
      rsvpStatus: true,
      plusOneRsvpStatus: true,
      respondedAt: true,
      createdAt: true,
      table: { select: { id: true, name: true } },
    },
  });

  // Serialize dates to strings for the client component
  const serialized = guests.map((g) => ({
    ...g,
    respondedAt: g.respondedAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
  }));

  return (
    <div className="py-6 lg:py-8">
      <GuestsClient eventId={eventId} initialGuests={serialized} />
    </div>
  );
}
