"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2, Scan, X, CheckCircle2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ScannerProps = {
  eventId: string;
};

export function ScannerClient({ eventId }: ScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
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
      scanner.stop().catch(() => {});
    };
  }, [eventId]);

  function handleCloseDialog() {
    setScannedToken(null);
    setGuestInfo(null);
    setLookupError(null);
    setConfirmed(false);
    scannerRef.current?.resume();
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
    } catch (err) {
      setLookupError("Erreur réseau.");
      console.error("Scanner checkin POST error:", err);
    } finally {
      setConfirming(false);
    }
  }

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 mb-4">
          <X className="h-7 w-7" />
        </div>
        <p className="text-sm font-medium text-slate-700">{cameraError}</p>
        <p className="mt-1 text-xs text-slate-400">
          Assurez-vous d&apos;utiliser HTTPS ou localhost et d&apos;autoriser la
          caméra.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <Scan className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            Scanner un code QR
          </h2>
          <p className="text-xs text-slate-400">
            Pointez la caméra vers le QR code de l&apos;invitation
          </p>
        </div>
      </div>

      <div
        ref={containerRef}
        id="scanner-container"
        className="overflow-hidden rounded-2xl bg-black"
        style={{ minHeight: 350 }}
      />

      {!scanning && !cameraError && (
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

      <Dialog
        open={!!scannedToken}
        onOpenChange={(o) => !o && handleCloseDialog()}
      >
        <DialogContent className="max-w-sm w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-4">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              {confirmed ? "Présence confirmée" : "Invité scanné"}
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
                Scanner un autre code
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
