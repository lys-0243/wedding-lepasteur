"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  Search,
  Upload,
  User,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MediaItem = {
  id: string;
  uploaderName: string;
  url: string;
  resourceType: "IMAGE" | "VIDEO";
  createdAt: string;
};

type UploadQueueItem = {
  id: string;
  name: string;
  previewUrl?: string;
  isVideo: boolean;
  status: "uploading" | "done" | "error";
};

type Props = {
  slug: string;
  title: string;
  coverImageUrl: string | null;
  profileImageUrl: string | null;
};

const MAX_FILES = 8;

const inputClassName =
  "mt-1 border-[#E8ECF4] bg-white text-sm shadow-sm h-12 px-4 rounded-3xl focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50";

const primaryBtnClassName =
  "w-full h-12 rounded-full bg-[#1E5FF5] text-white hover:bg-[#6a8ee2] cursor-pointer";

export function GalleryPublicClient({
  slug,
  title,
  coverImageUrl,
  profileImageUrl,
}: Props) {
  const [step, setStep] = useState<"pin" | "name" | "ready">("pin");
  const [pin, setPin] = useState("");
  const [uploaderName, setUploaderName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [quota, setQuota] = useState({ used: 0, max: MAX_FILES });
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const uploaderNames = useMemo(() => {
    const names = new Set(media.map((m) => m.uploaderName));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "fr"));
  }, [media]);

  const nameSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return uploaderNames.filter((name) => name.toLowerCase().includes(q));
  }, [uploaderNames, searchQuery]);

  const filteredMedia = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return media;
    return media.filter((m) => m.uploaderName.toLowerCase().includes(q));
  }, [media, searchQuery]);

  const groupedMedia = useMemo(() => {
    const map = new Map<string, MediaItem[]>();
    for (const item of filteredMedia) {
      const list = map.get(item.uploaderName) ?? [];
      list.push(item);
      map.set(item.uploaderName, list);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "fr"),
    );
  }, [filteredMedia]);

  const refreshMedia = useCallback(async () => {
    const res = await fetch(`/api/gallery/${slug}/media`);
    if (res.ok) {
      const data = await res.json();
      setMedia(data);
    }
  }, [slug]);

  const refreshQuota = useCallback(async () => {
    const res = await fetch(`/api/gallery/${slug}/quota`);
    if (res.ok) {
      const data = await res.json();
      setQuota(data);
    }
  }, [slug]);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/gallery/${slug}/unlock`);
        if (res.ok) {
          const data = await res.json();
          if (data.unlocked && data.uploaderName) {
            setUploaderName(data.uploaderName);
            setNameInput(data.uploaderName);
            setStep("ready");
            await Promise.all([refreshMedia(), refreshQuota()]);
          } else if (data.unlocked) {
            setStep("name");
          }
        }
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [slug, refreshMedia, refreshQuota]);

  useEffect(() => {
    return () => {
      for (const item of uploadQueue) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    };
    // Only revoke on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setUnlocking(true);
    try {
      const res = await fetch(`/api/gallery/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "PIN incorrect.");
        return;
      }
      setStep("name");
      toast.success("Accès débloqué.");
    } finally {
      setUnlocking(false);
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      const res = await fetch(`/api/gallery/${slug}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploaderName: nameInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur.");
        return;
      }
      setUploaderName(data.uploaderName);
      setStep("ready");
      await Promise.all([refreshMedia(), refreshQuota()]);
    } finally {
      setSavingName(false);
    }
  }

  async function uploadFile(file: File) {
    const isVideo = file.type.startsWith("video/");
    const resourceType = isVideo ? "video" : "image";

    const signRes = await fetch(`/api/gallery/${slug}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceType }),
    });
    const signData = await signRes.json();
    if (!signRes.ok) {
      throw new Error(signData.error ?? "Signature impossible.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signData.apiKey);
    formData.append("timestamp", String(signData.timestamp));
    formData.append("signature", signData.signature);
    formData.append("folder", signData.folder);

    const endpoint =
      resourceType === "video"
        ? `https://api.cloudinary.com/v1_1/${signData.cloudName}/video/upload`
        : `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`;

    const uploadRes = await fetch(endpoint, { method: "POST", body: formData });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.secure_url) {
      throw new Error("Échec de l'envoi vers Cloudinary.");
    }

    const registerRes = await fetch(`/api/gallery/${slug}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: uploadData.secure_url,
        publicId: uploadData.public_id,
        resourceType: isVideo ? "VIDEO" : "IMAGE",
      }),
    });
    const registerData = await registerRes.json();
    if (!registerRes.ok) {
      throw new Error(registerData.error ?? "Enregistrement impossible.");
    }

    return registerData;
  }

  function updateQueueItem(
    id: string,
    patch: Partial<Pick<UploadQueueItem, "status">>,
  ) {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = quota.max - quota.used;
    if (remaining <= 0) {
      toast.error(`Limite de ${MAX_FILES} fichiers atteinte.`);
      return;
    }

    const batch = files.slice(0, remaining);
    const queueItems: UploadQueueItem[] = batch.map((file, index) => {
      const isVideo = file.type.startsWith("video/");
      return {
        id: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        previewUrl: isVideo ? undefined : URL.createObjectURL(file),
        isVideo,
        status: "uploading" as const,
      };
    });

    setUploadQueue(queueItems);
    setUploading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < batch.length; i++) {
        const file = batch[i];
        const queueItem = queueItems[i];
        try {
          await uploadFile(file);
          successCount += 1;
          updateQueueItem(queueItem.id, { status: "done" });
        } catch (err) {
          updateQueueItem(queueItem.id, { status: "error" });
          toast.error(
            err instanceof Error ? err.message : "Erreur lors de l'envoi.",
          );
          break;
        }
      }
      if (successCount > 0) {
        toast.success(
          `${successCount} fichier${successCount > 1 ? "s" : ""} ajouté${successCount > 1 ? "s" : ""}.`,
        );
        await Promise.all([refreshMedia(), refreshQuota()]);
      }
    } finally {
      setUploading(false);
      setUploadQueue((prev) => {
        for (const item of prev) {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        }
        return [];
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la
          galerie…
        </div>
      </main>
    );
  }

  const uploadingCount = uploadQueue.filter(
    (q) => q.status === "uploading",
  ).length;

  return (
    <main className="min-h-screen bg-[#F4F6FB] py-8 px-4">
      <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-4xl bg-white shadow-sm">
        <div className="relative">
          {coverImageUrl ? (
            <div className="relative h-56 w-full overflow-hidden rounded-b-4xl bg-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImageUrl}
                alt={title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950/60 via-transparent" />
            </div>
          ) : (
            <div className="h-56 bg-slate-200" />
          )}

          <div className="absolute left-1/2 top-40 z-50 -translate-x-1/2 transform">
            <div className="h-40 w-40 overflow-hidden rounded-full border-4 border-white shadow-xl">
              {profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileImageUrl}
                  alt={title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-300 text-4xl font-semibold text-slate-600">
                  {title.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 pt-24 pb-6">
          <div className="text-center">
            <p className="text-base font-semibold uppercase tracking-[0.2em] text-slate-400">
              Galerie
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Partagez vos photos et vidéos du mariage avec les mariés.
            </p>
          </div>

          {step === "pin" && (
            <form
              onSubmit={handleUnlock}
              className="grid gap-4 rounded-3xl border border-[#E8ECF4] bg-slate-50 p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 text-[#1E5FF5]">
                <Lock className="h-5 w-5" />
                <h2 className="text-sm font-semibold text-slate-700">
                  Code PIN
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Saisissez le code indiqué sur votre table ou dans le livret.
              </p>
              <div>
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className={`${inputClassName} text-center text-lg tracking-widest font-mono`}
                  placeholder="••••"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={unlocking || pin.length < 4}
                className={primaryBtnClassName}
              >
                {unlocking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Accéder à la galerie"
                )}
              </Button>
            </form>
          )}

          {step === "name" && (
            <form
              onSubmit={handleSaveName}
              className="grid gap-4 rounded-3xl border border-[#E8ECF4] bg-slate-50 p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 text-[#1E5FF5]">
                <User className="h-5 w-5" />
                <h2 className="text-sm font-semibold text-slate-700">
                  Votre nom
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Comment souhaitez-vous apparaître ? (max {MAX_FILES} fichiers
                par personne)
              </p>
              <div>
                <Label htmlFor="name">Nom ou sobriquet</Label>
                <Input
                  id="name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className={inputClassName}
                  placeholder="Marie, Tonton Paul…"
                  maxLength={50}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={savingName || nameInput.trim().length < 2}
                className={primaryBtnClassName}
              >
                {savingName ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Continuer"
                )}
              </Button>
            </form>
          )}

          {step === "ready" && (
            <>
              <div className="grid gap-4 rounded-3xl border border-[#E8ECF4] bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">
                      Connecté en tant que
                    </p>
                    <p className="font-semibold text-slate-800">
                      {uploaderName}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#1E5FF5]">
                    {quota.used} / {quota.max}
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFilesSelected}
                />

                <Button
                  type="button"
                  disabled={uploading || quota.used >= quota.max}
                  onClick={() => fileInputRef.current?.click()}
                  className={`${primaryBtnClassName} gap-2`}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {quota.used >= quota.max
                    ? "Limite atteinte"
                    : "Ajouter photos ou vidéos"}
                </Button>

                <p className="text-xs text-slate-400 text-center">
                  Images et courtes vidéos · max {MAX_FILES} par personne
                </p>
              </div>

              <div>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Galerie ({filteredMedia.length}
                    {searchQuery.trim() ? ` / ${media.length}` : ""})
                    {uploadingCount > 0 ? ` · ${uploadingCount} en cours` : ""}
                  </h2>

                  <div className="flex items-center gap-1 rounded-full border border-[#E8ECF4] bg-slate-50 p-1 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors cursor-pointer ${
                        viewMode === "grid"
                          ? "bg-[#1E5FF5] text-white"
                          : "text-slate-500 hover:bg-white hover:text-slate-700"
                      }`}
                      title="Miniatures"
                      aria-label="Affichage miniatures"
                      aria-pressed={viewMode === "grid"}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors cursor-pointer ${
                        viewMode === "list"
                          ? "bg-[#1E5FF5] text-white"
                          : "text-slate-500 hover:bg-white hover:text-slate-700"
                      }`}
                      title="Liste"
                      aria-label="Affichage liste"
                      aria-pressed={viewMode === "list"}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {media.length > 0 && (
                  <div ref={searchWrapRef} className="relative mb-4">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSuggestionsOpen(true);
                        }}
                        onFocus={() => setSuggestionsOpen(true)}
                        placeholder="Rechercher un contributeur…"
                        className="h-11 rounded-3xl border-[#E8ECF4] bg-white pl-11 pr-10 shadow-sm focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50"
                        autoComplete="off"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSuggestionsOpen(false);
                          }}
                          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                          aria-label="Effacer la recherche"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {suggestionsOpen &&
                      searchQuery.trim() &&
                      nameSuggestions.length > 0 && (
                        <ul className="absolute z-20 mt-2 max-h-48 w-full overflow-y-auto rounded-2xl border border-[#E8ECF4] bg-white py-1 shadow-lg">
                          {nameSuggestions.map((name) => (
                            <li key={name}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchQuery(name);
                                  setSuggestionsOpen(false);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-[#E9F0FF] hover:text-[#1E5FF5] cursor-pointer"
                              >
                                <User className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                )}

                {uploadQueue.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-sm font-bold text-slate-800">
                      Envoi en cours
                    </h3>
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {uploadQueue.map((item) => (
                          <div
                            key={item.id}
                            className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"
                          >
                            {item.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.previewUrl}
                                alt={item.name}
                                className="h-full w-full object-cover opacity-60"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-200">
                                <Video className="h-8 w-8 text-slate-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 backdrop-blur-[2px]">
                              {item.status === "uploading" && (
                                <>
                                  <Loader2 className="h-7 w-7 animate-spin text-white" />
                                  <p className="max-w-[90%] truncate px-2 text-center text-[10px] font-medium text-white">
                                    Envoi…
                                  </p>
                                </>
                              )}
                              {item.status === "error" && (
                                <p className="px-2 text-center text-xs font-semibold text-red-200">
                                  Échec
                                </p>
                              )}
                              {item.status === "done" && (
                                <p className="px-2 text-center text-xs font-semibold text-emerald-200">
                                  OK
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ul className="divide-y divide-[#E8ECF4] overflow-hidden rounded-3xl border border-[#E8ECF4] bg-slate-50">
                        {uploadQueue.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center gap-3 px-4 py-3"
                          >
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                              {item.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.previewUrl}
                                  alt=""
                                  className="h-full w-full object-cover opacity-60"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Video className="h-5 w-5 text-slate-400" />
                                </div>
                              )}
                              {item.status === "uploading" && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {item.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {item.status === "uploading"
                                  ? "Envoi en cours…"
                                  : item.status === "error"
                                    ? "Échec"
                                    : "Terminé"}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {media.length === 0 && uploadQueue.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-[#E8ECF4] bg-slate-50 py-12 text-slate-400">
                    <Camera className="h-8 w-8" />
                    <p className="text-sm">Soyez les premiers à partager !</p>
                  </div>
                ) : filteredMedia.length === 0 && uploadQueue.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-[#E8ECF4] bg-slate-50 py-12 text-slate-400">
                    <User className="h-8 w-8" />
                    <p className="text-sm">Aucun fichier pour ce filtre.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedMedia.map(([guestName, items]) => (
                      <section key={guestName}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="text-base font-bold text-slate-800">
                            {guestName}
                          </h3>
                          <span className="text-xs font-medium text-slate-400">
                            {items.length} fichier
                            {items.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {viewMode === "grid" ? (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {items.map((item, index) => (
                              <div
                                key={item.id}
                                className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100"
                              >
                                {item.resourceType === "VIDEO" ? (
                                  <video
                                    src={item.url}
                                    className="h-full w-full object-cover"
                                    controls
                                    preload="metadata"
                                  />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.url}
                                    alt={`${guestName} — Photo ${index + 1}`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-2">
                                  <p className="truncate text-xs font-medium text-white">
                                    {item.resourceType === "VIDEO"
                                      ? `Vidéo ${index + 1}`
                                      : `Photo ${index + 1}`}
                                  </p>
                                </div>
                                {item.resourceType === "VIDEO" && (
                                  <Video className="absolute right-2 top-2 h-4 w-4 text-white drop-shadow" />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <ul className="divide-y divide-[#E8ECF4] overflow-hidden rounded-3xl border border-[#E8ECF4] bg-slate-50">
                            {items.map((item, index) => (
                              <li
                                key={item.id}
                                className="flex items-center gap-3 px-4 py-3"
                              >
                                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                                  {item.resourceType === "VIDEO" ? (
                                    <video
                                      src={item.url}
                                      className="h-full w-full object-cover"
                                      preload="metadata"
                                      muted
                                      playsInline
                                    />
                                  ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={item.url}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  )}
                                  {item.resourceType === "VIDEO" && (
                                    <Video className="absolute right-1 top-1 h-3.5 w-3.5 text-white drop-shadow" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-slate-800">
                                    {item.resourceType === "VIDEO"
                                      ? `Vidéo ${index + 1}`
                                      : `Photo ${index + 1}`}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {item.resourceType === "VIDEO"
                                      ? "Vidéo"
                                      : "Photo"}
                                  </p>
                                </div>
                                {item.resourceType === "VIDEO" ? (
                                  <video
                                    src={item.url}
                                    controls
                                    preload="metadata"
                                    className="h-10 max-w-28 rounded-lg"
                                  />
                                ) : (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 text-xs font-semibold text-[#1E5FF5] hover:underline"
                                  >
                                    Voir
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
