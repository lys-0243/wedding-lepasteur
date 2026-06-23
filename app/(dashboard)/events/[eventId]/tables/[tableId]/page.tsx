import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TableDetailClient } from "@/components/tables/table-detail-client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    eventId: string;
    tableId: string;
  }>;
};

export default async function TableDetailPage({ params }: Props) {
  const user = await requireUser();
  const { eventId, tableId } = await params;

  // Verify event belongs to user
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });

  if (!event) notFound();

  // Fetch table and associated guests
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
      guests: {
        orderBy: { lastName: "asc" },
      },
    },
  });

  if (!table || table.eventId !== eventId) notFound();

  return (
    <div className="min-h-full bg-[#F4F6FB] p-6 lg:p-8">
      <TableDetailClient eventId={eventId} table={table} />
    </div>
  );
}
