import { notFound } from "next/navigation";
import { Images } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GalleryPublicClient } from "@/components/gallery/gallery-public-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { title: true },
  });
  if (!event) return {};
  return { title: `Galerie — ${event.title}` };
}

function GalleryDisabledMessage({
  title,
  coverImageUrl,
  profileImageUrl,
}: {
  title: string;
  coverImageUrl: string | null;
  profileImageUrl: string | null;
}) {
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

        <div className="space-y-4 px-6 pt-24 pb-10 text-center">
          <p className="text-base font-semibold uppercase tracking-[0.2em] text-slate-400">
            Galerie
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>

          <div className="mx-auto mt-4 flex max-w-md flex-col items-center gap-3 rounded-3xl border border-[#E8ECF4] bg-slate-50 px-6 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E9F0FF] text-[#1E5FF5]">
              <Images className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-slate-800">
              Le partage des photos n&apos;a pas encore été activé
            </p>
            <p className="text-sm text-slate-500">
              Les organisateurs n&apos;ont pas encore ouvert la galerie pour cet
              événement. Revenez un peu plus tard.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function PublicGalleryPage({ params }: Props) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      title: true,
      coverImageUrl: true,
      profileImageUrl: true,
      galleryEnabled: true,
    },
  });

  if (!event) {
    notFound();
  }

  if (!event.galleryEnabled) {
    return (
      <GalleryDisabledMessage
        title={event.title}
        coverImageUrl={event.coverImageUrl}
        profileImageUrl={event.profileImageUrl}
      />
    );
  }

  return (
    <GalleryPublicClient
      slug={slug}
      title={event.title}
      coverImageUrl={event.coverImageUrl}
      profileImageUrl={event.profileImageUrl}
    />
  );
}
