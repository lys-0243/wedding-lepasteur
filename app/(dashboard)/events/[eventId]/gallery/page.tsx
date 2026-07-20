import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEventAccess } from "@/lib/permissions";
import { GalleryDashboardClient } from "@/components/gallery/gallery-dashboard-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true },
  });
  if (!event) return {};
  return { title: `Galerie — ${event.title}` };
}

export default async function GalleryDashboardPage({ params }: Props) {
  const { eventId } = await params;
  await requireEventAccess(eventId, "gallery:read");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      slug: true,
      title: true,
      galleryEnabled: true,
      galleryPin: true,
      mediaLinks: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          uploaderName: true,
          url: true,
          publicId: true,
          resourceType: true,
          createdAt: true,
        },
      },
    },
  });

  if (!event) notFound();

  const serializedLinks = event.mediaLinks.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <GalleryDashboardClient
      eventId={eventId}
      slug={event.slug}
      title={event.title}
      initialEnabled={event.galleryEnabled}
      initialPin={event.galleryPin}
      initialLinks={serializedLinks}
    />
  );
}
