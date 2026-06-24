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
  console.log("[TableDetailPage] Started rendering");
  const user = await requireUser();
  console.log("[TableDetailPage] Logged in user:", user ? { id: user.id, email: user.email } : null);
  const { eventId, tableId } = await params;
  console.log("[TableDetailPage] Resolved params:", { eventId, tableId });

  // Verify event belongs to user
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  console.log("[TableDetailPage] Event verification result:", event);

  if (!event) {
    console.log("[TableDetailPage] Event not found or not owned by user. Calling notFound().");
    notFound();
  }

  // Fetch table and associated guests
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
      guests: {
        orderBy: { lastName: "asc" },
      },
    },
  });
  console.log("[TableDetailPage] Table fetch result:", table ? { id: table.id, name: table.name, eventId: table.eventId } : null);

  if (!table) {
    console.log("[TableDetailPage] Table not found in DB. Calling notFound().");
    notFound();
  }

  if (table.eventId !== eventId) {
    console.log(`[TableDetailPage] Table eventId mismatch: table.eventId=${table.eventId}, eventId=${eventId}. Calling notFound().`);
    notFound();
  }

  console.log("[TableDetailPage] All checks passed, rendering TableDetailClient");

  return (
    <div className="min-h-full bg-[#F4F6FB] p-6 lg:p-8">
      <TableDetailClient eventId={eventId} table={table} />
    </div>
  );
}

