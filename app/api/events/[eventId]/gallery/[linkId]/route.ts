import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ eventId: string; linkId: string }>;
};

async function destroyCloudinaryAsset(publicId: string, resourceType: string) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return;

  const timestamp = Math.floor(Date.now() / 1000);
  const type = resourceType === "VIDEO" ? "video" : "image";
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(toSign).digest("hex");

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });

  await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${type}/destroy`,
    { method: "POST", body },
  );
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId, linkId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const link = await prisma.eventMediaLink.findFirst({
    where: { id: linkId, eventId },
  });
  if (!link) {
    return NextResponse.json({ error: "Lien introuvable." }, { status: 404 });
  }

  if (link.publicId) {
    await destroyCloudinaryAsset(link.publicId, link.resourceType);
  }

  await prisma.eventMediaLink.delete({ where: { id: linkId } });

  return NextResponse.json({ success: true });
}
