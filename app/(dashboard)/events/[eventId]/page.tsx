import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, GlassWater, Users, Armchair } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type EventPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

function formatEventDate(date: Date | null) {
  if (!date) {
    return "Date a definir";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function EventPage({ params }: EventPageProps) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      userId: user.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      venue: true,
      eventDate: true,
      _count: {
        select: {
          guests: true,
          drinks: true,
          tables: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-linear-to-b from-[#DDF4F2] via-[#EAEFF9] to-[#DCCBF4] px-4 py-6 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <section className="relative mx-auto w-full max-w-4xl rounded-[1.8rem] border border-white/60 bg-white/65 p-3 shadow-[0_18px_60px_rgba(137,126,201,0.3)] backdrop-blur-sm sm:p-4">
        <div className="rounded-3xl border border-[#DEE4EF] bg-[#F7F8FC] p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Dashboard evenement
              </p>
              <h1 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-slate-800 sm:text-[1.7rem]">
                {event.title}
              </h1>
            </div>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#D8DEEA] bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:h-10 sm:px-3.5 sm:text-sm"
            >
              Retour a la liste
            </Link>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E3E8F0] bg-white p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                Date
              </p>
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <CalendarDays className="h-4 w-4 text-[#AF8BFF]" />
                {formatEventDate(event.eventDate)}
              </p>
            </div>
            <div className="rounded-xl border border-[#E3E8F0] bg-white p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                Lieu
              </p>
              <p className="text-sm font-medium text-slate-700">{event.venue ?? "A definir"}</p>
            </div>
          </div>

          {event.description && (
            <p className="mb-6 rounded-xl border border-[#E3E8F0] bg-white p-3 text-sm leading-relaxed text-slate-600">
              {event.description}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-[#E3E8F0] bg-white p-4">
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                <Users className="h-4 w-4 text-[#AF8BFF]" />
                Invites
              </p>
              <p className="text-2xl font-semibold text-slate-800">{event._count.guests}</p>
            </article>

            <article className="rounded-xl border border-[#E3E8F0] bg-white p-4">
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                <GlassWater className="h-4 w-4 text-[#AF8BFF]" />
                Boissons
              </p>
              <p className="text-2xl font-semibold text-slate-800">{event._count.drinks}</p>
            </article>

            <article className="rounded-xl border border-[#E3E8F0] bg-white p-4">
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                <Armchair className="h-4 w-4 text-[#AF8BFF]" />
                Tables
              </p>
              <p className="text-2xl font-semibold text-slate-800">{event._count.tables}</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
