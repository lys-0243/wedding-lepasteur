import { NextRequest, NextResponse } from "next/server";
import {
  getGalleryEventBySlug,
  readGallerySession,
  sanitizeUploaderName,
  writeGallerySession,
} from "@/lib/gallery";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const session = await readGallerySession(slug);

  if (!session) {
    return NextResponse.json(
      { error: "Session expirée. Saisissez le PIN à nouveau." },
      { status: 401 },
    );
  }

  const event = await getGalleryEventBySlug(slug);
  if (!event || !event.galleryEnabled) {
    return NextResponse.json({ error: "Galerie introuvable." }, { status: 404 });
  }

  const body = (await req.json()) as { uploaderName?: string };
  const uploaderName = sanitizeUploaderName(body.uploaderName ?? "");

  if (!uploaderName || uploaderName.length < 2) {
    return NextResponse.json(
      { error: "Indiquez un nom ou un sobriquet (2 caractères minimum)." },
      { status: 400 },
    );
  }

  await writeGallerySession({
    slug,
    eventId: event.id,
    uploaderName,
  });

  return NextResponse.json({ success: true, uploaderName });
}
