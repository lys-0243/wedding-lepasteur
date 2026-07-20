import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEventAccess } from "@/lib/permissions";
import { GuestsClient } from "@/components/guests/guests-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type GuestsPageProps = {
  params: Promise<{ eventId: string }>;
};

export async function generateMetadata({ params }: GuestsPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true },
  });
  if (!event) return {};
  return { title: `Invités — ${event.title}` };
}

export default async function GuestsPage({ params }: GuestsPageProps) {
  const { eventId } = await params;
  const { membership } = await requireEventAccess(eventId, "guests:read");
  const canWriteGuests = membership.role === "OWNER";

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, eventDate: true },
  });
  if (!event) notFound();

  const guests = await prisma.guest.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      token: true,
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
      checkedInAt: true,
      createdAt: true,
      table: { select: { id: true, name: true } },
    },
  });

  // Serialize dates to strings for the client component
  const serialized = guests.map((g) => ({
    ...g,
    respondedAt: g.respondedAt?.toISOString() ?? null,
    checkedInAt: g.checkedInAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
  }));

  return (
    <div className="py-6 lg:py-8">
      <GuestsClient
        eventId={eventId}
        initialGuests={serialized}
        canEditGuests={canWriteGuests}
        canWriteGuests={canWriteGuests}
        event={{
          title: event.title,
          eventDate: event.eventDate?.toISOString() ?? null,
        }}
      />
    </div>
  );
}
