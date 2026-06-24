import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DrinksClient } from "@/components/drinks/drinks-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export default async function DrinksPage({ params }: Props) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });

  if (!event) notFound();

  const catalog = await prisma.drink.findMany({
    orderBy: [{ isAlcoholic: "desc" }, { name: "asc" }],
  });

  const selected = await prisma.drink.findMany({
    where: { eventDrinks: { some: { eventId } } },
    orderBy: [{ isAlcoholic: "desc" }, { name: "asc" }],
  });

  return (
    <div className="min-h-full bg-[#F4F6FB] p-6 lg:p-8">
      <DrinksClient
        eventId={eventId}
        initialDrinks={selected}
        catalog={catalog}
      />
    </div>
  );
}
