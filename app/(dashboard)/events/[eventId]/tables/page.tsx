import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TablesClient } from "@/components/tables/tables-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

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
    include: { _count: { select: { guests: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-full bg-[#F4F6FB] p-6 lg:p-8">
      <TablesClient eventId={eventId} initialTables={tables} />
    </div>
  );
}
