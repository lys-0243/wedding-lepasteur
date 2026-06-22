"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Camera, Loader2, Eye, EyeOff, X } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";
import { signupAction } from "../actions";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
          {/* Avatar upload via CldUploadWidget */}
          <div className="flex flex-col items-center gap-2 mb-2">
            <CldUploadWidget
              uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
              options={{
                folder: process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER ?? "wedding",
                cropping: true,
                croppingAspectRatio: 1,
                maxFiles: 1,
                resourceType: "image",
                sources: ["local", "camera"],
                styles: {
                  palette: {
                    window: "#F7F8FC",
                    windowBorder: "#DEE4EF",
                    tabIcon: "#534AB7",
                    menuIcons: "#534AB7",
                    textDark: "#1e293b",
                    textLight: "#FFFFFF",
                    link: "#534AB7",
                    action: "#534AB7",
                    inactiveTabIcon: "#94a3b8",
                    error: "#dc2626",
                    inProgress: "#534AB7",
                    complete: "#22c55e",
                    sourceBg: "#F7F8FC",
                  },
                },
              }}
              onSuccess={(result) => {
                if (
                  result.event === "success" &&
                  typeof result.info === "object" &&
                  result.info !== null &&
                  "secure_url" in result.info
                ) {
                  setAvatarUrl(result.info.secure_url as string);
                }
              }}
            >
              {({ open }) => (
                <div className="group relative flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => open()}
                    className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-dashed border-[#B7C4E0] bg-white text-slate-400 hover:border-[#534AB7] hover:text-[#534AB7] transition-all cursor-pointer"
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera className="h-6 w-6" />
                    )}
                  </button>
                  <span className="text-[0.7rem] font-semibold text-slate-500">
                    {avatarUrl ? "Changer de photo" : "Ajouter une photo (optionnel)"}
                  </span>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAvatarUrl("");
                      }}
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </CldUploadWidget>
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

          {state?.error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {state.error}
            </p>
          )}

          <div className="pt-2">
            <SubmitButton disabled={false} />
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
