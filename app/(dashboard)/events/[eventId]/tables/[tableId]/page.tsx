import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  const user = await requireUser();
  const { eventId, tableId } = await params;

  // Verify event belongs to user
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });

  if (!event) {
    console.log(
      "[TableDetailPage] Event not found or not owned by user. Calling notFound().",
    );
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

  if (!table) {
    console.log("[TableDetailPage] Table not found in DB. Calling notFound().");
    notFound();
  }

  if (table.eventId !== eventId) {
    console.log(
      `[TableDetailPage] Table eventId mismatch: table.eventId=${table.eventId}, eventId=${eventId}. Calling notFound().`,
    );
    notFound();
  }

  return (
    <div className="min-h-full bg-[#F4F6FB] p-6 lg:p-8">
      <TableDetailClient eventId={eventId} table={table} />
    </div>
  );
}
