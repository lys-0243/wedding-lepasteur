import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEventAccess } from "@/lib/permissions";
import { TableDetailClient } from "@/components/tables/table-detail-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    eventId: string;
    tableId: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId, tableId } = await params;
  const [event, table] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }),
    prisma.table.findUnique({ where: { id: tableId }, select: { name: true } }),
  ]);
  if (!event || !table) return {};
  return { title: `Table ${table.name} — ${event.title}` };
}

export default async function TableDetailPage({ params }: Props) {
  const { eventId, tableId } = await params;
  const { membership } = await requireEventAccess(eventId, "tables:read");

  // Fetch table and associated guests
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
      guests: {
        orderBy: { lastName: "asc" },
      },
    },
  });

  if (!table) {
    notFound();
  }

  if (table.eventId !== eventId) {
    notFound();
  }

  return (
    <div className="min-h-full bg-[#F4F6FB] p-6 lg:p-8">
      <TableDetailClient
        eventId={eventId}
        table={table}
        canEditGuests={membership.role === "OWNER"}
        canWriteGuests={membership.role === "OWNER"}
      />
    </div>
  );
}
