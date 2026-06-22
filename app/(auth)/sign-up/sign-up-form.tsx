"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Camera, Loader2, Eye, EyeOff } from "lucide-react";
import { signupAction } from "../actions";

const imagekitPublicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
const imagekitFolder = process.env.NEXT_PUBLIC_IMAGEKIT_FOLDER ?? "wedding";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full inline-flex h-10 items-center justify-center rounded-lg bg-[#534AB7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#41399B] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
    >
      {pending ? "Inscription..." : "Créer mon compte"}
    </button>
  );
}

export function SignUpForm() {
  const [state, formAction] = useActionState(signupAction, null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onPickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!imagekitPublicKey) {
      setUploadError("Configuration ImageKit manquante.");
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      // Get authentication parameters from our route handler
      const authResponse = await fetch("/api/imagekit/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          folder: imagekitFolder,
          useUniqueFileName: true,
        }),
      });

      const authPayload = (await authResponse.json()) as {
        token?: string;
        error?: string;
      };

      if (!authResponse.ok || !authPayload.token) {
        throw new Error(
          authPayload.error ?? "Impossible de générer le token ImageKit.",
        );
      }

      // Upload directly to ImageKit
      const uploadBody = new FormData();
      uploadBody.append("file", file);
      uploadBody.append("fileName", file.name);
      uploadBody.append("folder", imagekitFolder);
      uploadBody.append("useUniqueFileName", "true");
      uploadBody.append("token", authPayload.token);

      const response = await fetch(
        "https://upload.imagekit.io/api/v2/files/upload",
        {
          method: "POST",
          body: uploadBody,
        },
      );

      const payload = (await response.json()) as {
        url?: string;
        error?: { message?: string };
      };

      if (!response.ok || !payload.url) {
        throw new Error(
          payload.error?.message ?? "Upload ImageKit impossible.",
        );
      }

      setAvatarUrl(payload.url);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Erreur lors de l'upload.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md rounded-[1.8rem] border border-white/60 bg-white/65 p-3 shadow-[0_18px_60px_rgba(137,126,201,0.3)] backdrop-blur-sm sm:p-4">
      <div className="rounded-3xl border border-[#DEE4EF] bg-[#F7F8FC] p-5 sm:p-6">
        <div className="mb-5 text-center">
          <h1 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-slate-800 sm:text-[1.6rem]">
            Créer un compte
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rejoignez Le Pasteur pour organiser votre mariage
          </p>
        </div>

        <form action={formAction} className="grid gap-4">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-dashed border-[#B7C4E0] bg-white text-slate-400 hover:border-[#534AB7] hover:text-[#534AB7] transition-all">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-[#534AB7]" />
              ) : (
                <Camera className="h-6 w-6" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={onPickFile}
                disabled={uploading}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
            <span className="text-[0.7rem] font-semibold text-slate-500">
              {uploading
                ? "Chargement..."
                : avatarUrl
                  ? "Changer de photo"
                  : "Ajouter une photo (optionnel)"}
            </span>
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
              placeholder="Ex: Sarah Martin"
              className="h-10 w-full rounded-lg border border-[#DCE2ED] bg-white px-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#B7C4E0]"
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
              placeholder="votre@email.com"
              className="h-10 w-full rounded-lg border border-[#DCE2ED] bg-white px-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#B7C4E0]"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-slate-700"
            >
              Mot de passe *
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 6 caractères"
                className="h-10 w-full rounded-lg border border-[#DCE2ED] bg-white px-3 pr-10 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#B7C4E0]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="passwordConfirm"
              className="text-sm font-semibold text-slate-700"
            >
              Confirmer le mot de passe *
            </label>
            <div className="relative">
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Répétez votre mot de passe"
                className="h-10 w-full rounded-lg border border-[#DCE2ED] bg-white px-3 pr-10 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#B7C4E0]"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? "Masquer la confirmation"
                    : "Afficher la confirmation"
                }
                className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-700"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {uploadError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {uploadError}
            </p>
          )}

          {state?.error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {state.error}
            </p>
          )}

          <div className="pt-2">
            <SubmitButton disabled={uploading} />
          </div>

          <div className="text-center mt-2">
            <p className="text-xs text-slate-500">
              Déjà un compte ?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-[#534AB7] hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
