import { EditEventForm } from "./edit-event-form";
import { prisma } from "@/lib/prisma";
import { requireEventAccess } from "@/lib/permissions";
import { updateEventAction } from "../actions";
import type { Metadata } from "next";

type EditPageProps = { params: Promise<{ eventId: string }> };

export async function generateMetadata({
  params,
}: EditPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true },
  });
  if (!event) return {};
  return { title: `Modifier — ${event.title}` };
}

export default async function EditEventPage({ params }: EditPageProps) {
  const { eventId } = await params;
  await requireEventAccess(eventId, "event:write");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      eventDate: true,
      venue: true,
      description: true,
      profileImageUrl: true,
      coverImageUrl: true,
      invitationFileUrl: true,
      eventDrinks: { select: { drinkId: true } },
    },
  });

  if (!event) {
    return <p>Événement introuvable.</p>;
  }

  const catalogDrinks = await prisma.drink.findMany({
    orderBy: [{ isAlcoholic: "desc" }, { name: "asc" }],
    select: { id: true, name: true, isAlcoholic: true },
  });

  const initial = {
    id: event.id,
    title: event.title,
    eventDate: event.eventDate?.toISOString() ?? null,
    venue: event.venue ?? null,
    description: event.description ?? null,
    profileImageUrl: event.profileImageUrl ?? null,
    coverImageUrl: event.coverImageUrl ?? null,
    invitationFileUrl: event.invitationFileUrl ?? null,
    selectedDrinkIds: event.eventDrinks.map((ed) => ed.drinkId),
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden  px-4 py-8 sm:px-6">
      <section className="relative w-full max-w-2xl rounded-[1.8rem] border border-white/60 bg-white/65 p-3 shadow-[0_18px_60px_rgba(137,126,201,0.3)] backdrop-blur-sm sm:p-4">
        <div className="rounded-3xl border border-[#DEE4EF] bg-[#F7F8FC] p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-slate-800 sm:text-[1.6rem]">
              Modifier l&apos;événement
            </h1>
          </div>

          <EditEventForm
            action={updateEventAction}
            catalogDrinks={catalogDrinks}
            initial={initial}
          />
        </div>
      </section>
    </main>
  );
}
