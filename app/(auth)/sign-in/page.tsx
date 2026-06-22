import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

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
      <SignInForm />
    </main>
  );
}
