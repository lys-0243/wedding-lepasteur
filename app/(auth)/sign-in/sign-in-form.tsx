"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { loginAction } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex h-10 items-center justify-center rounded-lg bg-[#534AB7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#41399B] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
    >
      {pending ? "Connexion..." : "Se connecter"}
    </button>
  );
}

export function SignInForm() {
  const [state, formAction] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full max-w-md rounded-[1.8rem] border border-white/60 bg-white/65 p-3 shadow-[0_18px_60px_rgba(137,126,201,0.3)] backdrop-blur-sm sm:p-4">
      <div className="rounded-3xl border border-[#DEE4EF] bg-[#F7F8FC] p-5 sm:p-6">
        <div className="mb-6 text-center">
          <h1 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-slate-800 sm:text-[1.6rem]">
            Le Pasteur
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Connectez-vous pour gérer votre mariage
          </p>
        </div>

        <form action={formAction} className="grid gap-4">
          <div className="grid gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-slate-700"
            >
              Adresse email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="votre@email.com"
              className="h-10 w-full rounded-lg border border-[#DCE2ED] bg-white px-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#B7C4E0]"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-slate-700"
              >
                Mot de passe
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
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

          {state?.error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {state.error}
            </p>
          )}

          <div className="pt-2">
            <SubmitButton />
          </div>

          <div className="text-center mt-2">
            <p className="text-xs text-slate-500">
              Pas encore de compte ?{" "}
              <Link
                href="/sign-up"
                className="font-semibold text-[#534AB7] hover:underline"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
