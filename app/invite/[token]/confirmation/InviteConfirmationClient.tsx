"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Wine, GlassWater } from "lucide-react";
import { Button } from "@/components/ui/button";

type Rsvp = "PENDING" | "CONFIRMED" | "DECLINED";
type AssignedTo = "PRIMARY" | "PLUS_ONE";
type InvitationType = "SINGLE" | "COUPLE";

type Drink = {
  id: string;
  name: string;
  category: string | null;
  isAlcoholic: boolean;
  imageUrl: string | null;
};

type Selection = {
  drinkId: string;
  assignedTo: AssignedTo;
  quantity: number;
};

type InviteState = {
  guest: {
    token: string;
    firstName: string;
    lastName: string;
    invitationType: InvitationType;
    plusOneFirstName: string | null;
    plusOneLastName: string | null;
    rsvpStatus: Rsvp;
    plusOneRsvpStatus: Rsvp | null;
    respondedAt: string | null;
    event: {
      title: string;
      slug: string;
      eventDate: string | null;
      venue: string | null;
      profileImageUrl: string | null;
      coverImageUrl: string | null;
    };
  };
  drinks: Drink[];
  selections: Selection[];
};

function formatDate(iso: string | null) {
  if (!iso) return "Date à définir";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default function InviteConfirmationClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<InviteState | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<Rsvp>("PENDING");
  const [plusOneRsvpStatus, setPlusOneRsvpStatus] = useState<Rsvp>("PENDING");
  const [primaryDrinkId, setPrimaryDrinkId] = useState("");
  const [plusOneDrinkId, setPlusOneDrinkId] = useState("");

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/invite/${token}/state`, {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));

      if (!mounted) return;

      if (!res.ok) {
        setError(payload.error ?? "Invitation introuvable.");
        setLoading(false);
        return;
      }

      const nextState = payload as InviteState;
      setState(nextState);

      setRsvpStatus(nextState.guest.rsvpStatus);
      setPlusOneRsvpStatus(nextState.guest.plusOneRsvpStatus ?? "PENDING");

      const primary = nextState.selections.find(
        (s) => s.assignedTo === "PRIMARY",
      );
      const plusOne = nextState.selections.find(
        (s) => s.assignedTo === "PLUS_ONE",
      );
      setPrimaryDrinkId(primary?.drinkId ?? "");
      setPlusOneDrinkId(plusOne?.drinkId ?? "");

      setLoading(false);
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [token]);

  const guestFullName = useMemo(() => {
    if (!state) return "";
    return `${state.guest.firstName} ${state.guest.lastName}`.trim();
  }, [state]);

  const rsvpOptions = [
    { status: "CONFIRMED" as const, label: "Je serai là" },
    { status: "PENDING" as const, label: "Peut-être" },
    { status: "DECLINED" as const, label: "Je ne serai pas là" },
  ];

  async function handleSave() {
    if (!state || !primaryDrinkId) {
      setError("Merci de sélectionner au moins la boisson principale.");
      return;
    }

    if (state.guest.invitationType === "COUPLE" && !plusOneDrinkId) {
      setError("Merci de sélectionner la boisson de l'accompagnateur.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const rsvpRes = await fetch(`/api/invite/${token}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsvpStatus,
          plusOneRsvpStatus:
            state.guest.invitationType === "COUPLE" ? plusOneRsvpStatus : null,
        }),
      });

      const rsvpPayload = await rsvpRes.json().catch(() => ({}));
      if (!rsvpRes.ok) {
        setError(
          rsvpPayload.error ?? "Impossible d'enregistrer la réponse RSVP.",
        );
        return;
      }

      const drinkRes = await fetch(`/api/invite/${token}/drinks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryDrinkId,
          plusOneDrinkId:
            state.guest.invitationType === "COUPLE"
              ? plusOneDrinkId
              : undefined,
        }),
      });

      const drinkPayload = await drinkRes.json().catch(() => ({}));
      if (!drinkRes.ok) {
        setError(
          drinkPayload.error ?? "Impossible d'enregistrer les boissons.",
        );
        return;
      }

      setState((prev) =>
        prev
          ? {
              ...prev,
              selections: drinkPayload.selections ?? prev.selections,
              guest: {
                ...prev.guest,
                rsvpStatus,
                plusOneRsvpStatus:
                  prev.guest.invitationType === "COUPLE"
                    ? plusOneRsvpStatus
                    : null,
                respondedAt: new Date().toISOString(),
              },
            }
          : prev,
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement de
          l'invitation...
        </div>
      </main>
    );
  }

  if (error && !state) {
    return (
      <main className="min-h-screen bg-[#F4F6FB] flex items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {error}
        </div>
      </main>
    );
  }

  if (!state) return null;

  return (
    <main className="min-h-screen bg-[#F4F6FB] py-8 px-4">
      <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-sm">
        <div className="relative overflow-hidden">
          {state.guest.event.coverImageUrl ? (
            <div className="relative h-56 w-full overflow-hidden rounded-b-[2rem] bg-slate-200">
              <img
                src={state.guest.event.coverImageUrl}
                alt={state.guest.event.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent" />
            </div>
          ) : (
            <div className="h-56 bg-slate-200" />
          )}

          <div className="absolute left-1/2 top-40 z-10 -translate-x-1/2 transform">
            <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-xl">
              {state.guest.event.profileImageUrl ? (
                <img
                  src={state.guest.event.profileImageUrl}
                  alt={state.guest.event.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-300 text-slate-600">
                  {state.guest.event.title.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 pt-24 pb-6">
          <div className="text-center">
            <p className="text-base font-semibold uppercase tracking-[0.2em] text-slate-400">
              Invitation
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {state.guest.event.title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Invitation de {guestFullName} ·{" "}
              {formatDate(state.guest.event.eventDate)}
              {state.guest.event.venue ? ` · ${state.guest.event.venue}` : ""}
            </p>
          </div>

          <div className="grid gap-4 rounded-3xl border border-[#E8ECF4] bg-slate-50 p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">
              Confirmez votre présence
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {rsvpOptions.map(({ status, label }) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setRsvpStatus(status)}
                  className={`rounded-3xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    rsvpStatus === status
                      ? "border-[#1E5FF5] bg-[#E9F0FF] text-[#1E5FF5]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-[#E8ECF4] bg-slate-50 p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">
              Boisson principale
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {state.drinks.map((drink) => (
                <button
                  key={drink.id}
                  type="button"
                  onClick={() => setPrimaryDrinkId(drink.id)}
                  className={`inline-flex items-center justify-between rounded-3xl border px-3 py-3 text-sm ${
                    primaryDrinkId === drink.id
                      ? "border-[#1E5FF5] bg-[#E9F0FF] text-[#1E5FF5]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {drink.isAlcoholic ? (
                      <Wine className="h-4 w-4" />
                    ) : (
                      <GlassWater className="h-4 w-4" />
                    )}
                    {drink.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {state.guest.invitationType === "COUPLE" && (
            <div className="grid gap-4 rounded-3xl border border-[#E8ECF4] bg-slate-50 p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-700">
                Boisson accompagnateur
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {state.drinks.map((drink) => (
                  <button
                    key={`plus-${drink.id}`}
                    type="button"
                    onClick={() => setPlusOneDrinkId(drink.id)}
                    className={`inline-flex items-center justify-between rounded-3xl border px-3 py-3 text-sm ${
                      plusOneDrinkId === drink.id
                        ? "border-[#1E5FF5] bg-[#E9F0FF] text-[#1E5FF5]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {drink.isAlcoholic ? (
                        <Wine className="h-4 w-4" />
                      ) : (
                        <GlassWater className="h-4 w-4" />
                      )}
                      {drink.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              onClick={() => void handleSave()}
              disabled={submitting}
              className="bg-[#1E5FF5] hover:bg-[#154ED0] text-white"
            >
              {submitting ? "Enregistrement..." : "Enregistrer ma réponse"}
            </Button>

            <a
              href={`/api/invite/${token}/invitation`}
              className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Télécharger mon invitation
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
