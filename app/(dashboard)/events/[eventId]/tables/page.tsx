import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TablesClient } from "@/components/tables/tables-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true },
  });
  if (!event) return {};
  return { title: `Tables — ${event.title}` };
}

export default async function TablesPage({ params }: Props) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });

  if (!event) notFound();

  const tables = await prisma.table.findMany({
    where: { eventId },
    include: { guests: { select: { invitationType: true } } },
    orderBy: { name: "asc" },
  });

  const mappedTables = tables.map((table) => ({
    id: table.id,
    name: table.name,
    capacity: table.capacity,
    _count: {
      guests: table.guests.reduce((sum, guest) => {
        const invitationType = String(guest.invitationType).toUpperCase();
        return (
          sum +
          (invitationType === "COUPLE" || invitationType === "DUO" ? 2 : 1)
        );
      }, 0),
    },
  }));

  return (
    <div className="min-h-full bg-[#F4F6FB] p-6 lg:p-8">
      <TablesClient eventId={eventId} initialTables={mappedTables} />
    </div>
  );
}
