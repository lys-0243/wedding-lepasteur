import { NextResponse } from "next/server";
import crypto from "crypto";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [".pdf", ".png", ".jpg", ".jpeg"];

export async function POST(req: Request) {
  try {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      console.error("Cloudinary credentials manquantes.");
      return NextResponse.json(
        { error: "Erreur de configuration du serveur." },
        { status: 500 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const eventId = formData.get("eventId") as string | null;

    if (!file || !eventId) {
      return NextResponse.json(
        { error: "Fichier ou identifiant d'événement manquant." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Le fichier ne doit pas dépasser 5 Mo." },
        { status: 400 },
      );
    }

    const name = file.name.toLowerCase();
    const isAllowed = ALLOWED_TYPES.some((t) => name.endsWith(t));
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Seuls les fichiers PDF, PNG et JPEG sont acceptés." },
        { status: 400 },
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = "lepasteur/invitations";

    const toSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");

    const body = new FormData();
    body.append("file", file);
    body.append("folder", folder);
    body.append("timestamp", String(timestamp));
    body.append("api_key", API_KEY);
    body.append("signature", signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body },
    );

    const data = await res.json();

    if (!res.ok || !data.secure_url) {
      console.error("Cloudinary upload error:", data);
      return NextResponse.json(
        { error: "Erreur lors de l'upload du fichier." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: data.secure_url });
  } catch (err) {
    console.error("Upload invitation error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'upload du fichier." },
      { status: 500 },
    );
  }
}
