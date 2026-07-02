"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Loader2,
  Scan,
  Search,
  X,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ScannerProps = {
  eventId: string;
};

type SearchGuest = {
  id: string;
  token: string;
  name: string;
  tableName: string | null;
  checkedInAt: string | null;
};

export function ScannerClient({ eventId }: ScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [guests, setGuests] = useState<SearchGuest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [guestsError, setGuestsError] = useState<string | null>(null);
  const [lookupSource, setLookupSource] = useState<"scan" | "search">("scan");
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [guestInfo, setGuestInfo] = useState<{
    name: string;
    tableName: string | null;
    checkedInAt: string | null;
  } | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoadingGuests(true);
    setGuestsError(null);

    fetch(`/api/events/${eventId}/guests`)
      .then(async (res) => {
        const data = (await res.json()) as Array<{
          id: string;
          token: string;
          firstName: string;
          lastName: string;
          invitationType: "SINGLE" | "COUPLE";
          checkedInAt: string | null;
          table: { name: string } | null;
        }>;

        if (!res.ok) {
          throw new Error("Impossible de charger les invités.");
        }

        if (cancelled) return;

        setGuests(
          data
            .filter((guest) => Boolean(guest.token))
            .map((guest) => ({
              id: guest.id,
              token: guest.token,
              name:
                guest.invitationType === "COUPLE"
                  ? `Couple ${guest.firstName} ${guest.lastName}`.trim()
                  : `${guest.firstName} ${guest.lastName}`.trim(),
              tableName: guest.table?.name ?? null,
              checkedInAt: guest.checkedInAt,
            })),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setGuestsError("Impossible de charger la liste des invités.");
        console.error("Guests fetch error:", err);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingGuests(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const filteredGuests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return guests;
    return guests.filter((guest) => guest.name.toLowerCase().includes(query));
  }, [guests, searchQuery]);

  useEffect(() => {
    if (!cameraEnabled) return;

    setCameraError(null);

    const scanner = new Html5Qrcode("scanner-container");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          let token: string | null = null;
          try {
            const url = new URL(decodedText);
            token = url.searchParams.get("token");
          } catch {
            // Le QR ne contient pas une URL valide, ignorer
            return;
          }
          if (!token) return;

          setLookupSource("scan");
          setScannedToken(token);
          scanner.pause();

          setLoadingInfo(true);
          setLookupError(null);

          fetch(
            `/api/events/${eventId}/checkin/lookup?token=${encodeURIComponent(token)}`,
          )
            .then(async (res) => {
              const text = await res.text();
              let data;
              try {
                data = JSON.parse(text);
              } catch {
                setLookupError(`Erreur ${res.status} — réponse inattendue.`);
                console.log(text);
                return null;
              }
              return data;
            })
            .then((data) => {
              if (!data) return;
              if (data.error) {
                setLookupError(data.error);
                return;
              }
              setGuestInfo(data.guest);
            })
            .catch((err) => {
              setLookupError("Erreur réseau.");
              console.error("Scanner lookup fetch error:", err);
            })
            .finally(() => {
              setLoadingInfo(false);
            });
        },
        () => {},
      )
      .then(() => setScanning(true))
      .catch((err) => {
        setCameraError(
          err?.toString()?.includes("NotAllowed")
            ? "Accès à la caméra refusé. Autorisez l'accès dans les paramètres."
            : "Impossible d'accéder à la caméra.",
        );
      });

    return () => {
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          scanner.clear();
          setScanning(false);
        });
    };
  }, [cameraEnabled, eventId]);

  function handleSelectGuest(guest: SearchGuest) {
    setLookupSource("search");
    setScannedToken(guest.token);
    setGuestInfo({
      name: guest.name,
      tableName: guest.tableName,
      checkedInAt: guest.checkedInAt,
    });
    setLookupError(null);
    setConfirmed(false);
    setLoadingInfo(false);
  }

  function handleCloseDialog() {
    setScannedToken(null);
    setGuestInfo(null);
    setLookupError(null);
    setConfirmed(false);
    if (cameraEnabled && scanning) {
      scannerRef.current?.resume();
    }
  }

  async function handleConfirmCheckin() {
    if (!scannedToken) return;
    setConfirming(true);

    try {
      const res = await fetch(`/api/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: scannedToken }),
      });
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        setLookupError(`Erreur ${res.status} — réponse inattendue.`);
        return;
      }

      if (!res.ok || !data.success) {
        setLookupError(data.error ?? "Erreur lors de la validation.");
        return;
      }

      setGuestInfo(data.guest);
      setConfirmed(true);
      setGuests((prev) =>
        prev.map((guest) =>
          guest.token === scannedToken
            ? { ...guest, checkedInAt: data.guest.checkedInAt }
            : guest,
        ),
      );
    } catch (err) {
      setLookupError("Erreur réseau.");
      console.error("Scanner checkin POST error:", err);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {!cameraEnabled && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Search className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Rechercher un invité
              </h2>
              <p className="text-xs text-slate-500">
                Tapez un nom puis cliquez sur un invité pour ouvrir sa fiche.
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex: Marie Dupont"
              className="pl-9"
            />
          </div>

          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70">
            {loadingGuests ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des invités...
              </div>
            ) : guestsError ? (
              <div className="px-4 py-6 text-center text-sm text-red-600">
                {guestsError}
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Aucun invité ne correspond à cette recherche.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {filteredGuests.map((guest) => (
                  <li key={guest.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectGuest(guest)}
                      className="w-full px-4 py-3 text-left hover:bg-white transition-colors hover:cursor-pointer"
                    >
                      <p className="text-sm font-medium text-slate-800">
                        {guest.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span>
                          {guest.tableName
                            ? `Table ${guest.tableName}`
                            : "Sans table"}
                        </span>
                        {guest.checkedInAt && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                            Déjà arrivé
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Scan className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Scanner un code QR
            </h2>
            <p className="text-xs text-slate-400">
              Activez la caméra uniquement si vous souhaitez scanner un QR code.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => {
            if (cameraEnabled) {
              setCameraEnabled(false);
              setCameraError(null);
              return;
            }
            setCameraEnabled(true);
          }}
          className={
            cameraEnabled
              ? "h-10 rounded-xl bg-[#1e57f5] border border-slate-200 text-sm font-medium text-white hover:bg-[#0a2769]"
              : "h-10 rounded-xl bg-[#1E5FF5] text-white text-sm font-medium hover:bg-[#154ED0]"
          }
        >
          {cameraEnabled ? (
            <X className="mr-2 h-4 w-4" />
          ) : (
            <Scan className="mr-2 h-4 w-4" />
          )}
          {cameraEnabled ? "Recherche manuelle" : "Ouvrir le scanner"}
        </Button>

        {cameraEnabled && (
          <>
            {cameraError ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 px-4 py-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-red-500">
                  <X className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-red-700">
                  {cameraError}
                </p>
                <p className="mt-1 text-xs text-red-600/80">
                  Assurez-vous d&apos;utiliser HTTPS ou localhost et
                  d&apos;autoriser la caméra.
                </p>
              </div>
            ) : (
              <>
                <div
                  id="scanner-container"
                  className="overflow-hidden rounded-2xl bg-black"
                  style={{ minHeight: "50vh" }}
                />

                {!scanning && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Initialisation de la caméra...
                  </div>
                )}

                {scanning && (
                  <p className="mt-3 text-center text-xs text-slate-400">
                    La caméra est active. Scannez un QR code d&apos;invitation.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>

      <Dialog
        open={!!scannedToken}
        onOpenChange={(o) => !o && handleCloseDialog()}
      >
        <DialogContent className="max-w-sm w-full rounded-3xl bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-4">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              {confirmed
                ? "Présence confirmée"
                : lookupSource === "scan"
                  ? "Invité scanné"
                  : "Invité sélectionné"}
            </DialogTitle>
          </DialogHeader>

          {loadingInfo ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#1E5FF5]" />
            </div>
          ) : lookupError ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {lookupError}
              </div>
              <Button
                onClick={handleCloseDialog}
                className="w-full h-10 rounded-xl bg-[#1E5FF5] text-white text-sm font-medium hover:bg-[#154ED0] cursor-pointer"
              >
                Fermer
              </Button>
            </div>
          ) : guestInfo ? (
            <div className="space-y-4">
              {confirmed && (
                <div className="flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-[#F4F6FB] px-4 py-3 space-y-2">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Invité
                  </p>
                  <p className="text-base font-bold text-slate-800">
                    {guestInfo.name}
                  </p>
                </div>

                {guestInfo.checkedInAt && !confirmed && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                    <UserCheck className="h-3.5 w-3.5" />
                    Déjà enregistré à{" "}
                    {new Date(guestInfo.checkedInAt).toLocaleTimeString(
                      "fr-FR",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </div>
                )}

                {guestInfo.tableName && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Table
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                      {guestInfo.tableName}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCloseDialog}
                  className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Fermer
                </Button>

                {!confirmed && (
                  <Button
                    onClick={() => void handleConfirmCheckin()}
                    disabled={confirming}
                    className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  >
                    {confirming ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Validation...
                      </span>
                    ) : (
                      "Valider la présence"
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
