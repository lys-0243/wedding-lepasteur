import { NextRequest, NextResponse } from "next/server";
import {
  GALLERY_MAX_UPLOADS,
  countUploaderLinks,
  getGalleryEventBySlug,
  normalizeUploaderName,
  readGallerySession,
} from "@/lib/gallery";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const session = await readGallerySession(slug);

  if (!session?.uploaderName) {
    return NextResponse.json(
      { error: "Nom requis." },
      { status: 401 },
    );
  }

  const event = await getGalleryEventBySlug(slug);
  if (!event || !event.galleryEnabled) {
    return NextResponse.json({ error: "Galerie introuvable." }, { status: 404 });
  }

  const normalized = normalizeUploaderName(session.uploaderName);
  const used = await countUploaderLinks(event.id, normalized);

  return NextResponse.json({ used, max: GALLERY_MAX_UPLOADS });
}
