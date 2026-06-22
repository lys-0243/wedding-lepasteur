import Link from "next/link";
import {
  CalendarCheck2,
  CircleAlert,
  Sparkles,
  Wrench,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const eventIcons = [Sparkles, CalendarCheck2, Wrench];

function formatEventDate(date: Date | null) {
  if (!date) {
    return "Date a definir";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function Home() {
  const user = await requireUser();

  const events = await prisma.event.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      title: true,
      description: true,
      eventDate: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const sortedEvents = [...events].sort((a, b) => {
    const left = a.eventDate ? a.eventDate.getTime() : -Infinity;
    const right = b.eventDate ? b.eventDate.getTime() : -Infinity;

    if (right !== left) {
      return right - left;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-b from-[#DDF4F2] via-[#EAEFF9] to-[#DCCBF4] px-4 py-6 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-xl rounded-[1.8rem] border border-white/60 bg-white/65 p-3 shadow-[0_18px_60px_rgba(137,126,201,0.3)] backdrop-blur-sm sm:p-4">
        <div className="rounded-3xl border border-[#DEE4EF] bg-[#F7F8FC] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-slate-800 sm:text-[1.6rem]">
              Vos evenements
            </h1>
            <Link
              href="/events/new"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#A27AFA] bg-[#AF8BFF] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#9E76FF] sm:h-10 sm:px-3.5 sm:text-sm"
            >
              Creer un evenement
            </Link>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl bg-[#E6EBF3] p-1">
            <button
              type="button"
              className="rounded-lg bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 shadow-[0_1px_0_rgba(0,0,0,0.05)]"
            >
              A venir
            </button>
            <button
              type="button"
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
            >
              Passés
            </button>
          </div>

          <div className="space-y-0.5">
            {sortedEvents.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#DCE2ED] bg-white px-4 py-6 text-center text-sm text-slate-500">
                Aucun evenement pour le moment. Creez votre premier evenement.
              </div>
            )}

            {sortedEvents.map((event, index) => {
              const Icon = eventIcons[index % eventIcons.length];

              return (
                <div key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className="block rounded-xl px-1 transition-colors hover:bg-white/70"
                  >
                    <article className="grid grid-cols-[auto_1fr_auto] items-start gap-3 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-slate-500 shadow-[inset_0_-2px_0_rgba(0,0,0,0.03)]">
                        <Icon className="h-4.5 w-4.5" />
                      </div>

                      <div>
                        <p className="mb-0.5 flex items-center gap-1.5 text-base font-semibold leading-tight tracking-[-0.02em] text-slate-800 sm:text-[1.05rem]">
                          <CircleAlert className="h-3 w-3 fill-[#AF8BFF] text-[#AF8BFF]" />
                          {event.title}
                        </p>
                        <p className="max-w-md text-sm leading-snug text-slate-500 sm:text-[0.95rem]">
                          {event.description}
                        </p>
                      </div>

                      <p className="pt-0.5 text-xs font-medium text-slate-400 sm:text-sm">
                        {formatEventDate(event.eventDate)}
                      </p>
                    </article>
                  </Link>

                  {index < sortedEvents.length - 1 && (
                    <div className="mt-2 h-px bg-[#E6EAF1]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/60 px-4 py-2 text-xs font-semibold text-slate-500 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/80 hover:text-slate-800 active:scale-95 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </form>
      </div>
    </main>
  );
}
