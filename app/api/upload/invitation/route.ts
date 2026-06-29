import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [".pdf", ".png", ".jpg", ".jpeg"];

export async function POST(req: Request) {
  try {
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

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      return NextResponse.json(
        { error: "Seuls les fichiers PDF, PNG et JPEG sont acceptés." },
        { status: 400 },
      );
    }

    const dir = path.join(process.cwd(), "public", "invitations");
    await mkdir(dir, { recursive: true });

    const uniqueName = `${eventId}-${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(dir, uniqueName);
    await writeFile(filePath, buffer);

    return NextResponse.json({ url: `/invitations/${uniqueName}` });
  } catch (err) {
    console.error("Upload invitation error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'upload du fichier." },
      { status: 500 },
    );
  }
}
