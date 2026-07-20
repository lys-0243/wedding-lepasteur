"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Copy,
  Download,
  ImageIcon,
  Loader2,
  RefreshCw,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type MediaLink = {
  id: string;
  uploaderName: string;
  url: string;
  publicId: string | null;
  resourceType: "IMAGE" | "VIDEO";
  createdAt: string;
};

type Props = {
  eventId: string;
  slug: string;
  title: string;
  initialEnabled: boolean;
  initialPin: string | null;
  initialLinks: MediaLink[];
};

const inputClassName =
  "border-[#E8ECF4] bg-white text-sm shadow-sm h-10 px-4 rounded-xl focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50";

const outlineBtnClassName =
  "border-[#E8ECF4] text-slate-600 hover:bg-slate-50 cursor-pointer h-10 rounded-xl";

export function GalleryDashboardClient({
  eventId,
  slug,
  title,
  initialEnabled,
  initialPin,
  initialLinks,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pin, setPin] = useState(initialPin ?? "");
  const [links, setLinks] = useState<MediaLink[]>(initialLinks);
  const [saving, setSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewerItem, setViewerItem] = useState<MediaLink | null>(null);

  const galleryUrl = useMemo(() => {
    if (typeof window === "undefined") return `/g/${slug}`;
    return `${window.location.origin}/g/${slug}`;
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/g/${slug}`;
    QRCode.toDataURL(url, { width: 256, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [slug]);

  useEffect(() => {
    if (!viewerItem) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setViewerItem(null);
    }

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [viewerItem]);

  const grouped = useMemo(() => {
    const map = new Map<string, MediaLink[]>();
    for (const link of links) {
      const list = map.get(link.uploaderName) ?? [];
      list.push(link);
      map.set(link.uploaderName, list);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "fr"),
    );
  }, [links]);

  async function saveSettings(patch: {
    galleryEnabled?: boolean;
    galleryPin?: string;
    regeneratePin?: boolean;
  }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/gallery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la sauvegarde.");
        return null;
      }
      if (typeof data.galleryEnabled === "boolean") {
        setEnabled(data.galleryEnabled);
      }
      if (data.galleryPin) setPin(data.galleryPin);
      return data;
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(next: boolean) {
    const data = await saveSettings({ galleryEnabled: next });
    if (data) {
      toast.success(
        data.galleryEnabled ? "Galerie activée." : "Galerie désactivée.",
      );
      if (data.galleryPin && !pin) setPin(data.galleryPin);
    }
  }

  async function handleSavePin() {
    const data = await saveSettings({ galleryPin: pin });
    if (data) toast.success("PIN enregistré.");
  }

  async function handleRegeneratePin() {
    const data = await saveSettings({ regeneratePin: true });
    if (data) toast.success("Nouveau PIN généré.");
  }

  async function handleDelete(linkId: string) {
    setDeletingId(linkId);
    try {
      const res = await fetch(`/api/events/${eventId}/gallery/${linkId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Suppression impossible.");
        return;
      }
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      if (viewerItem?.id === linkId) setViewerItem(null);
      toast.success("Média supprimé.");
    } finally {
      setDeletingId(null);
    }
  }

  function copyPin() {
    void navigator.clipboard.writeText(pin);
    toast.success("PIN copié.");
  }

  function copyUrl() {
    void navigator.clipboard.writeText(galleryUrl);
    toast.success("Lien copié.");
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `galerie-${slug}-qr.png`;
    a.click();
  }

  return (
    <>
      <div className="py-6 lg:py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 lg:text-2xl">
            Galerie
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {title} · {links.length} média{links.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Settings */}
          <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Paramètres</h2>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Galerie publique
                </p>
                <p className="text-xs text-slate-400">
                  Les invités peuvent envoyer des photos et vidéos
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-semibold ${
                    enabled ? "text-[#1E5FF5]" : "text-slate-400"
                  }`}
                >
                  {enabled ? "Activée" : "Désactivée"}
                </span>
                <Switch
                  checked={enabled}
                  disabled={saving}
                  onCheckedChange={(next) => void handleToggle(next)}
                  aria-label="Activer la galerie publique"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gallery-pin">
                Code PIN (à communiquer aux invités)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="gallery-pin"
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  placeholder="1234"
                  className={`${inputClassName} font-mono text-lg tracking-widest`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyPin}
                  disabled={!pin}
                  title="Copier le PIN"
                  className={outlineBtnClassName}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleRegeneratePin()}
                  disabled={saving}
                  title="Générer un nouveau PIN"
                  className={outlineBtnClassName}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={saving || pin.length < 4}
                onClick={() => void handleSavePin()}
                className="h-10 px-4 rounded-xl bg-[#1E5FF5] text-white hover:bg-[#154ED0] cursor-pointer"
              >
                Enregistrer le PIN
              </Button>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E8ECF4]">
              <Label>Lien public</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={galleryUrl}
                  className={`${inputClassName} text-xs`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyUrl}
                  className={outlineBtnClassName}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* QR */}
          <div className="rounded-2xl border border-[#E8ECF4] bg-white p-5 shadow-sm flex flex-col items-center gap-4">
            <h2 className="text-sm font-bold text-slate-800 self-start">
              QR code
            </h2>
            <p className="text-xs text-slate-500 self-start -mt-2">
              À imprimer sur les tables ou le livret d&apos;accueil
            </p>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="QR code galerie"
                className="h-48 w-48 rounded-xl border border-[#E8ECF4]"
              />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadQr}
              disabled={!qrDataUrl}
              className={`gap-2 ${outlineBtnClassName}`}
            >
              <Download className="h-4 w-4" />
              Télécharger le QR
            </Button>
          </div>
        </div>

        {/* Contributions */}
        <div className="rounded-2xl border border-[#E8ECF4] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E8ECF4] px-5 py-4">
            <h2 className="text-sm font-bold text-slate-800">
              Contributions ({grouped.length} invité
              {grouped.length !== 1 ? "s" : ""})
            </h2>
          </div>

          {grouped.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
              <ImageIcon className="h-10 w-10" />
              <p className="text-sm">Aucun média pour le moment.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#E8ECF4]">
              {grouped.map(([name, items]) => (
                <li key={name} className="px-5 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold text-slate-800">{name}</p>
                    <span className="text-xs text-slate-400">
                      {items.length} fichier{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100"
                      >
                        <button
                          type="button"
                          onClick={() => setViewerItem(item)}
                          className="absolute inset-0 z-[1] cursor-pointer"
                          title={
                            item.resourceType === "VIDEO"
                              ? "Lire la vidéo"
                              : "Voir la photo"
                          }
                          aria-label={
                            item.resourceType === "VIDEO"
                              ? "Lire la vidéo"
                              : "Voir la photo"
                          }
                        />
                        {item.resourceType === "VIDEO" ? (
                          <video
                            src={item.url}
                            className="pointer-events-none h-full w-full object-cover"
                            preload="metadata"
                            muted
                            playsInline
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.url}
                            alt=""
                            className="pointer-events-none h-full w-full object-cover"
                          />
                        )}
                        {item.resourceType === "VIDEO" && (
                          <span className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/20">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white shadow-sm">
                              <Video className="h-4 w-4" />
                            </span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(item.id);
                          }}
                          disabled={deletingId === item.id}
                          className="absolute right-1.5 top-1.5 z-[2] flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 cursor-pointer"
                          title="Supprimer"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Lightbox — voir photo / lire vidéo */}
      {viewerItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-md p-4"
          onClick={() => setViewerItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu du média"
        >
          <button
            type="button"
            onClick={() => setViewerItem(null)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-sm transition-colors hover:bg-white cursor-pointer"
            title="Fermer"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {viewerItem.resourceType === "VIDEO" ? (
              <video
                key={viewerItem.id}
                src={viewerItem.url}
                controls
                autoPlay
                playsInline
                className="max-h-[85vh] max-w-[90vw] rounded-xl bg-black shadow-2xl"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewerItem.url}
                alt=""
                className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
              />
            )}
            <p className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
              {viewerItem.uploaderName}
              {viewerItem.resourceType === "VIDEO" ? " · Vidéo" : " · Photo"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
