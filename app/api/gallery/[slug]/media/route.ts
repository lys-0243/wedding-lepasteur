import { NextRequest, NextResponse } from "next/server";
import {
  GALLERY_MAX_UPLOADS,
  countUploaderLinks,
  galleryFolder,
  getGalleryEventBySlug,
  normalizeUploaderName,
  readGallerySession,
  sanitizeUploaderName,
} from "@/lib/gallery";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ slug: string }> };

function isValidCloudinaryUrl(url: string, folder: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("res.cloudinary.com") &&
      (parsed.pathname.includes(folder.replace(/\//g, ",")) ||
        parsed.pathname.includes(encodeURIComponent(folder).replace(/%/g, "")) ||
        url.includes(folder.split("/").pop() ?? ""))
    );
  } catch {
    return false;
  }
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const event = await getGalleryEventBySlug(slug);

  if (!event || !event.galleryEnabled) {
    return NextResponse.json({ error: "Galerie introuvable." }, { status: 404 });
  }

  const links = await prisma.eventMediaLink.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      uploaderName: true,
      url: true,
      resourceType: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    links.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  );
}

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

  const body = (await req.json()) as {
    url?: string;
    publicId?: string;
    resourceType?: string;
  };

  const url = body.url?.trim();
  const publicId = body.publicId?.trim() || null;
  const resourceType =
    body.resourceType === "VIDEO" || body.resourceType === "video"
      ? "VIDEO"
      : "IMAGE";

  if (!url) {
    return NextResponse.json({ error: "URL manquante." }, { status: 400 });
  }

  const folder = galleryFolder(slug);
  if (!url.includes("res.cloudinary.com")) {
    return NextResponse.json({ error: "URL non autorisée." }, { status: 400 });
  }

  if (publicId && !publicId.startsWith(folder)) {
    return NextResponse.json({ error: "Fichier non autorisé." }, { status: 400 });
  }

  const uploaderName = sanitizeUploaderName(session.uploaderName);
  const normalized = normalizeUploaderName(uploaderName);
  const used = await countUploaderLinks(event.id, normalized);

  if (used >= GALLERY_MAX_UPLOADS) {
    return NextResponse.json(
      { error: `Limite de ${GALLERY_MAX_UPLOADS} fichiers atteinte pour ce nom.` },
      { status: 409 },
    );
  }

  const link = await prisma.eventMediaLink.create({
    data: {
      eventId: event.id,
      uploaderName,
      uploaderNameNormalized: normalized,
      url,
      publicId,
      resourceType,
    },
    select: {
      id: true,
      uploaderName: true,
      url: true,
      resourceType: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    {
      ...link,
      createdAt: link.createdAt.toISOString(),
      quota: { used: used + 1, max: GALLERY_MAX_UPLOADS },
    },
    { status: 201 },
  );
}
