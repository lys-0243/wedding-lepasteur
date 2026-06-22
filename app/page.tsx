import Link from "next/link";
import { CalendarCheck2, CircleAlert, Sparkles, Wrench, LogOut } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

const upcomingEvents = [
  {
    id: "event-1",
    title: "Mariage de Sarah & Adam",
    description: "Suivi invitations et relance RSVP en attente.",
    time: "Dans 1h",
    icon: Sparkles,
  },
  {
    id: "event-2",
    title: "Brunch du lendemain",
    description: "Validation des boissons et ajustement des quantites.",
    time: "Dans 3h",
    icon: CalendarCheck2,
  },
  {
    id: "event-3",
    title: "Soiree de bienvenue",
    description: "Mise a jour du plan de table avant envoi final.",
    time: "Dans 5h",
    icon: Wrench,
  },
];

export default function Home() {
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
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E3E7EE] bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:h-10 sm:px-3.5 sm:text-sm"
            >
              Creer un evenement
            </Link>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-xl bg-[#E6EBF3] p-1">
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
              Passes
            </button>
            <button
              type="button"
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-400"
            >
              Tous
            </button>
          </div>

          <div className="space-y-0.5">
            {upcomingEvents.map((event, index) => {
              const Icon = event.icon;

              return (
                <article
                  key={event.id}
                  className="grid grid-cols-[auto_1fr_auto] items-start gap-3 py-3"
                >
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
                    {event.time}
                  </p>

                  {index < upcomingEvents.length - 1 && (
                    <div className="col-span-3 mt-2 h-px bg-[#E6EAF1]" />
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <SignOutButton redirectUrl="/sign-in">
          <button className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/60 px-4 py-2 text-xs font-semibold text-slate-500 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/80 hover:text-slate-800 active:scale-95 cursor-pointer">
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </SignOutButton>
      </div>
    </main>
  );
}
