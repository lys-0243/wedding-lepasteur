import { notFound } from "next/navigation";
import {
  CalendarDays,
  MapPin,
  Users,
  Armchair,
  GlassWater,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EventPageProps = {
  params: Promise<{ eventId: string }>;
};

function formatDate(date: Date | null) {
  if (!date) return "Date à définir";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function EventDashboardPage({ params }: EventPageProps) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: {
      id: true,
      title: true,
      description: true,
      venue: true,
      eventDate: true,
      profileImageUrl: true,
      coverImageUrl: true,
      _count: {
        select: { guests: true, eventDrinks: true, tables: true },
      },
    },
  });

  if (!event) notFound();

  const stats = [
    {
      label: "Invités",
      value: event._count.guests,
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-50",
    },
    {
      label: "Tables",
      value: event._count.tables,
      icon: Armchair,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: "Boissons",
      value: event._count.eventDrinks,
      icon: GlassWater,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="min-h-full bg-[#F4F6FB]">
      {/* ── Cover photo ─────────────────────────────────────────────── */}
      <div className="relative h-60 w-full overflow-hidden bg-linear-to-br  from-[#C4B9F5] via-[#A8D8EA] to-[#DDF4F2] lg:h-64">
        {event.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImageUrl}
            alt="Photo de couverture"
            className="h-full w-full object-cover"
          />
        )}
        {/* Subtle gradient overlay at the bottom for readability */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/30 to-transparent" />
      </div>

      {/* ── Profile strip (avatar + title) ──────────────────────────── */}
      <div className="relative border-b border-[#E8ECF4] bg-white px-6 pb-4 lg:px-8">
        {/* Profile image — overlaps cover */}
        <div className="absolute -top-12 left-6 lg:left-8">
          {event.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.profileImageUrl}
              alt={event.title}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-lg lg:h-38 lg:w-38"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-[#534AB7] to-[#AF8BFF] ring-4 ring-white shadow-lg lg:h-28 lg:w-28">
              <span className="text-2xl font-bold text-white lg:text-3xl">
                {event.title.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Title + meta — shifted right to clear the avatar */}
        <div className="flex flex-col justify-end pt-16 sm:flex-row sm:items-end sm:justify-between sm:pt-4 sm:pl-36 lg:pl-40">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 lg:text-2xl">
              {event.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                {formatDate(event.eventDate)}
              </span>
              {event.venue && (
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {event.venue}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Page body ───────────────────────────────────────────────── */}
      <div className="p-6 lg:p-8">
        {/* Stats */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${bg}`}
              >
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-xs font-medium text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        {event.description && (
          <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm">
            <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
              Description
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              {event.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
