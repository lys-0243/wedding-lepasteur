import Link from "next/link";
import { createEventAction } from "./actions";
import { NewEventForm } from "./new-event-form";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nouvel événement",
};

export default async function NewEventPage() {
  const catalogDrinks = await prisma.drink.findMany({
    orderBy: [{ isAlcoholic: "desc" }, { name: "asc" }],
    select: { id: true, name: true, isAlcoholic: true },
  });

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
        <div className="flex justify-center mb-4 sm:mb-6">
          <img src="/logo.png" alt="Le Pasteur" className="h-10 sm:h-12 w-auto" />
        </div>
        <div className="rounded-3xl border border-[#DEE4EF] bg-[#F7F8FC] p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-slate-800 sm:text-[1.6rem]">
              Créer un événement
            </h1>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E3E7EE] bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:h-10 sm:px-3.5 sm:text-sm"
            >
              Retour
            </Link>
          </div>

          <NewEventForm
            action={createEventAction}
            catalogDrinks={catalogDrinks}
          />
        </div>
      </section>

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
