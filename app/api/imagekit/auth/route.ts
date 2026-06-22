import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

const imageKitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const imageKitPublicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
const defaultFolder = process.env.NEXT_PUBLIC_IMAGEKIT_FOLDER ?? "wedding";

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: Record<string, unknown>) {
  if (!imageKitPrivateKey || !imageKitPublicKey) {
    throw new Error("ImageKit credentials are missing.");
  }

  const header = {
    alg: "HS256",
    typ: "JWT",
    kid: imageKitPublicKey,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", imageKitPrivateKey)
    .update(message)
    .digest("base64");
  const encodedSignature = signature
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${message}.${encodedSignature}`;
}

export async function POST(request: Request) {
  if (!imageKitPrivateKey || !imageKitPublicKey) {
    return NextResponse.json(
      {
        error:
          "Configure IMAGEKIT_PRIVATE_KEY et NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    fileName?: string;
    folder?: string;
    useUniqueFileName?: boolean;
  };

  const fileName = body.fileName?.trim();

  if (!fileName) {
    return NextResponse.json(
      { error: "fileName is required." },
      { status: 400 },
    );
  }

  const folder = body.folder?.trim() || defaultFolder;
  const useUniqueFileName = body.useUniqueFileName ?? true;
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const token = signJwt({
    fileName,
    folder,
    useUniqueFileName: String(useUniqueFileName),
    iat,
    exp,
  });

  return NextResponse.json({ token });
}
