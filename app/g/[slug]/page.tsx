import { notFound } from "next/navigation";
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

  if (!event || !event.galleryEnabled) {
    notFound();
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
