import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { signToken, verifyToken } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export const GALLERY_MAX_UPLOADS = 8;
export const GALLERY_COOKIE = "gallery_session";
const GALLERY_SECRET =
  process.env.JWT_SECRET ?? "fallback_secret_at_least_32_chars_long";

export type GallerySession = {
  slug: string;
  eventId: string;
  uploaderName?: string;
};

export function normalizeUploaderName(name: string) {
  return name.trim().toLowerCase();
}

export function sanitizeUploaderName(name: string) {
  return name.trim().slice(0, 50);
}

export async function getGalleryEventBySlug(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      coverImageUrl: true,
      profileImageUrl: true,
      galleryEnabled: true,
      galleryPin: true,
    },
  });
}

export function galleryFolder(slug: string) {
  return `lepasteur/${slug}/guest-media`;
}

export async function readGallerySession(
  slug: string,
): Promise<GallerySession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(GALLERY_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyToken(token, GALLERY_SECRET);
  if (!payload || payload.slug !== slug) return null;

  return {
    slug: String(payload.slug),
    eventId: String(payload.eventId),
    uploaderName: payload.uploaderName
      ? String(payload.uploaderName)
      : undefined,
  };
}

export async function writeGallerySession(session: GallerySession) {
  const token = await signToken(
    {
      slug: session.slug,
      eventId: session.eventId,
      uploaderName: session.uploaderName,
      exp: Date.now() + 60 * 60 * 48 * 1000,
    },
    GALLERY_SECRET,
  );

  const cookieStore = await cookies();
  cookieStore.set(GALLERY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 48,
  });
}

export async function countUploaderLinks(eventId: string, normalizedName: string) {
  return prisma.eventMediaLink.count({
    where: { eventId, uploaderNameNormalized: normalizedName },
  });
}

export function signCloudinaryParams(options: {
  folder: string;
  resourceType: "image" | "video";
}) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey =
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ??
    process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary non configuré.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string> = {
    folder: options.folder,
    timestamp: String(timestamp),
  };

  if (options.resourceType === "video") {
    params.resource_type = "video";
  }

  const parameterString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const signature = createHash("sha1")
    .update(`${parameterString}${apiSecret}`)
    .digest("hex");

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder: options.folder,
    resourceType: options.resourceType,
  };
}

export function isCloudinaryUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("res.cloudinary.com");
  } catch {
    return false;
  }
}
