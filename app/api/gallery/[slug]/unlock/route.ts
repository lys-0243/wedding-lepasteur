import { NextRequest, NextResponse } from "next/server";
import {
  getGalleryEventBySlug,
  readGallerySession,
  writeGallerySession,
} from "@/lib/gallery";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const event = await getGalleryEventBySlug(slug);

  if (!event || !event.galleryEnabled) {
    return NextResponse.json({ error: "Galerie introuvable." }, { status: 404 });
  }

  if (!event.galleryPin) {
    return NextResponse.json(
      { error: "La galerie n'est pas encore configurée." },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { pin?: string };
  const pin = body.pin?.trim();

  if (!pin || pin !== event.galleryPin) {
    return NextResponse.json({ error: "Code PIN incorrect." }, { status: 401 });
  }

  await writeGallerySession({ slug, eventId: event.id });

  return NextResponse.json({ success: true });
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const session = await readGallerySession(slug);
  return NextResponse.json({
    unlocked: !!session,
    uploaderName: session?.uploaderName ?? null,
  });
}
