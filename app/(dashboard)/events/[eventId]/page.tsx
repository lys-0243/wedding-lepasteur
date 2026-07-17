import { notFound } from "next/navigation";
import {
  CalendarDays,
  MapPin,
  Users,
  Armchair,
  GlassWater,
  CheckCircle2,
  UserCheck,
  Clock,
  UserX,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EditLink from "./edit/link";

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

function guestHeads(invitationType: string) {
  return invitationType === "COUPLE" || invitationType === "DUO" ? 2 : 1;
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
      guests: {
        select: { rsvpStatus: true, invitationType: true },
      },
      tables: {
        select: { capacity: true },
      },
    },
  });

  if (!event) notFound();

  const totalFiches = event.guests.length;
  let pending = 0;
  let confirmed = 0;
  let declined = 0;
  let present = 0;
  let confirmedHeads = 0;
  let presentHeads = 0;
  let engagedHeads = 0;

  for (const g of event.guests) {
    const heads = guestHeads(g.invitationType);
    switch (g.rsvpStatus) {
      case "PENDING":
        pending += 1;
        break;
      case "CONFIRMED":
        confirmed += 1;
        confirmedHeads += heads;
        engagedHeads += heads;
        break;
      case "DECLINED":
        declined += 1;
        break;
      case "PRESENT":
        present += 1;
        presentHeads += heads;
        engagedHeads += heads;
        break;
    }
  }

  const responded = confirmed + declined + present;
  const responseRate =
    totalFiches > 0 ? Math.round((responded / totalFiches) * 100) : 0;
  const totalCapacity = event.tables.reduce((s, t) => s + t.capacity, 0);
  const capacityPct =
    totalCapacity > 0
      ? Math.min(Math.round((engagedHeads / totalCapacity) * 100), 100)
      : 0;

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
    {
      label: "Présents",
      value: presentHeads,
      icon: CheckCircle2,
      color: "text-sky-500",
      bg: "bg-sky-50",
    },
  ];

  const rsvpBreakdown = [
    {
      label: "Confirmés",
      count: confirmed,
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "En attente",
      count: pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Déclinés",
      count: declined,
      icon: UserX,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Présents",
      count: present,
      icon: CheckCircle2,
      color: "text-sky-600",
      bg: "bg-sky-50",
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
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/30 to-transparent" />
      </div>

      {/* ── Profile strip (avatar + title) ──────────────────────────── */}
      <div className="relative border-b border-[#E8ECF4] bg-white px-6 pb-4 lg:px-8">
        <div className="absolute -top-12 left-6 lg:left-8">
          {event.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.profileImageUrl}
              alt={event.title}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-lg lg:h-36 lg:w-36"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-[#534AB7] to-[#AF8BFF] ring-4 ring-white shadow-lg lg:h-28 lg:w-28">
              <span className="text-2xl font-bold text-white lg:text-3xl">
                {event.title.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

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
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Response rate */}
          <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm">
            <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
              Taux de réponse
            </p>
            <p className="text-3xl font-bold text-slate-800">
              {responseRate}
              <span className="text-lg font-semibold text-slate-400">%</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {responded} réponse{responded !== 1 ? "s" : ""} sur {totalFiches}{" "}
              fiche{totalFiches !== 1 ? "s" : ""}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#534AB7] transition-all"
                style={{ width: `${responseRate}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {rsvpBreakdown.map(({ label, count, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-xl ${bg} px-2.5 py-2`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${color}`}>{count}</p>
                    <p className="truncate text-[10px] text-slate-500">
                      {label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Capacity gauge */}
          <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm">
            <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
              Capacité engagée
            </p>
            <p className="text-3xl font-bold text-slate-800">
              {engagedHeads}
              <span className="text-lg font-semibold text-slate-400">
                {" "}
                / {totalCapacity}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {confirmedHeads} confirmé{confirmedHeads !== 1 ? "s" : ""} +{" "}
              {presentHeads} présent{presentHeads !== 1 ? "s" : ""} vs places
              aux tables
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  capacityPct >= 90
                    ? "bg-red-400"
                    : capacityPct >= 60
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                }`}
                style={{ width: `${capacityPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {capacityPct}% des places couvertes
            </p>
          </div>
        </div>

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
        <div className="mt-4">
          <EditLink eventId={event.id} />
        </div>
      </div>
    </div>
  );
}
