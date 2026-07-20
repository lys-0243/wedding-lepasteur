import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon profil",
};

export default async function ProfilePage() {
  const user = await requireUser();

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
      <ProfileForm
        initial={{
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        }}
      />
    </main>
  );
}
