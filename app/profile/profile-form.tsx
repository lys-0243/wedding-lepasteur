"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Camera, Eye, EyeOff, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  updateProfileAction,
  type ProfileActionState,
} from "./actions";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";
const FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER ?? "wedding";

type Props = {
  initial: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex h-11 items-center justify-center rounded-full bg-[#1E5FF5] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#154ED0] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
    >
      {pending ? "Enregistrement…" : "Enregistrer"}
    </button>
  );
}

export function ProfileForm({ initial }: Props) {
  const [state, formAction] = useActionState<ProfileActionState, FormData>(
    updateProfileAction,
    null,
  );
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    try {
      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error("Upload Cloudinary non configuré.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", `${FOLDER}/avatars`);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData },
      );

      const data = (await res.json()) as {
        secure_url?: string;
        error?: { message?: string };
      };

      if (!res.ok || !data.secure_url) {
        throw new Error(data.error?.message ?? "Échec de l'upload.");
      }

      setAvatarUrl(data.secure_url);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Erreur lors de l'upload.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const initials = (initial.name ?? initial.email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative w-full max-w-md rounded-[1.8rem] border border-white/60 bg-white/65 p-3 shadow-[0_18px_60px_rgba(137,126,201,0.3)] backdrop-blur-sm sm:p-4">
      <div className="rounded-3xl border border-[#DEE4EF] bg-[#F7F8FC] p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-slate-800 sm:text-[1.6rem]">
              Mon profil
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Modifiez votre nom, photo, email et mot de passe
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour
          </Link>
        </div>

        <form action={formAction} className="grid gap-4">
          <div className="flex flex-col items-center gap-2 mb-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#B7C4E0] bg-white text-slate-400 transition-all hover:border-[#1E5FF5] hover:text-[#1E5FF5] disabled:opacity-60 cursor-pointer"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[#1E5FF5]" />
                ) : (
                  <span className="text-lg font-bold text-[#534AB7]">
                    {initials}
                  </span>
                )}
              </button>

              {avatarUrl && !uploading && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors cursor-pointer"
                  title="Supprimer la photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#1E5FF5] text-white shadow hover:bg-[#154ED0] cursor-pointer disabled:opacity-60"
                title="Changer la photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <span className="text-[0.7rem] font-semibold text-slate-500">
              {uploading
                ? "Chargement…"
                : avatarUrl
                  ? "Changer de photo"
                  : "Ajouter une photo"}
            </span>
            {uploadError && (
              <p className="text-xs text-red-600 text-center">{uploadError}</p>
            )}
            <input type="hidden" name="avatarUrl" value={avatarUrl} />
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="name"
              className="text-sm font-semibold text-slate-700"
            >
              Nom complet
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={initial.name ?? ""}
              placeholder="Ex: Sarah Martin"
              className="h-11 w-full rounded-xl border border-[#DCE2ED] bg-white px-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50"
            />
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-slate-700"
            >
              Adresse email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={initial.email}
              required
              className="h-11 w-full rounded-xl border border-[#DCE2ED] bg-white px-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50"
            />
          </div>

          <div className="my-1 border-t border-[#E8ECF4] pt-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Changer le mot de passe
            </p>
            <p className="mb-3 text-xs text-slate-500">
              Laissez vide si vous ne souhaitez pas le modifier.
            </p>

            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <label
                  htmlFor="currentPassword"
                  className="text-sm font-medium text-slate-600"
                >
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type={showCurrent ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-11 w-full rounded-xl border border-[#DCE2ED] bg-white px-3 pr-10 text-sm text-slate-700 outline-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrent ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <label
                  htmlFor="newPassword"
                  className="text-sm font-medium text-slate-600"
                >
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showNew ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Min. 6 caractères"
                    className="h-11 w-full rounded-xl border border-[#DCE2ED] bg-white px-3 pr-10 text-sm text-slate-700 outline-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNew ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <label
                  htmlFor="newPasswordConfirm"
                  className="text-sm font-medium text-slate-600"
                >
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    id="newPasswordConfirm"
                    name="newPasswordConfirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    className="h-11 w-full rounded-xl border border-[#DCE2ED] bg-white px-3 pr-10 text-sm text-slate-700 outline-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {state?.error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
