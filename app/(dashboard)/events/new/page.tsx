import Link from "next/link";
import { createEventAction } from "./actions";
import { NewEventForm } from "./new-event-form";

export default function NewEventPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-b from-[#DDF4F2] via-[#EAEFF9] to-[#DCCBF4] px-4 py-8 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <section className="relative w-full max-w-2xl rounded-[1.8rem] border border-white/60 bg-white/65 p-3 shadow-[0_18px_60px_rgba(137,126,201,0.3)] backdrop-blur-sm sm:p-4">
        <div className="rounded-3xl border border-[#DEE4EF] bg-[#F7F8FC] p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-slate-800 sm:text-[1.6rem]">
              Creer un evenement
            </h1>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E3E7EE] bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:h-10 sm:px-3.5 sm:text-sm"
            >
              Retour
            </Link>
          </div>

          <NewEventForm action={createEventAction} />
        </div>
      </section>
    </main>
  );
}
