import { NextRequest, NextResponse } from "next/server";
import {
  galleryFolder,
  getGalleryEventBySlug,
  readGallerySession,
  signCloudinaryParams,
} from "@/lib/gallery";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const session = await readGallerySession(slug);

  if (!session?.uploaderName) {
    return NextResponse.json(
      { error: "Indiquez votre nom avant d'envoyer des fichiers." },
      { status: 401 },
    );
  }

  const event = await getGalleryEventBySlug(slug);
  if (!event || !event.galleryEnabled) {
    return NextResponse.json({ error: "Galerie introuvable." }, { status: 404 });
  }

  const body = (await req.json()) as { resourceType?: string };
  const resourceType = body.resourceType === "video" ? "video" : "image";

  try {
    const signed = signCloudinaryParams({
      folder: galleryFolder(slug),
      resourceType,
    });
    return NextResponse.json(signed);
  } catch {
    return NextResponse.json(
      { error: "Configuration Cloudinary manquante." },
      { status: 500 },
    );
  }
}
