import { prisma } from "@/lib/prisma";
import { requireEventAccess } from "@/lib/permissions";
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
  const { eventId } = await params;
  const { membership } = await requireEventAccess(eventId, "tables:read");

  const tables = await prisma.table.findMany({
    where: { eventId },
    include: {
      guests: { select: { invitationType: true, rsvpStatus: true } },
    },
    orderBy: { name: "asc" },
  });

  const mappedTables = tables.map((table) => {
    let assigned = 0;
    let present = 0;
    for (const guest of table.guests) {
      const heads =
        guest.invitationType === "COUPLE" || guest.invitationType === "DUO"
          ? 2
          : 1;
      assigned += heads;
      if (guest.rsvpStatus === "PRESENT") present += heads;
    }
    return {
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      _count: { guests: assigned, present },
    };
  });

  return (
    <div className="min-h-full bg-[#F4F6FB] p-6 lg:p-8">
      <TablesClient
        eventId={eventId}
        initialTables={mappedTables}
        canWriteTables={membership.role === "OWNER"}
      />
    </div>
  );
}
