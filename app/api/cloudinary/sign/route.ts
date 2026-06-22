import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cloudinaryApiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

export async function POST(request: Request) {
  if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
    return NextResponse.json(
      {
        error:
          "Configurez NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, NEXT_PUBLIC_CLOUDINARY_API_KEY, et CLOUDINARY_API_SECRET.",
      },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as {
      folder?: string;
    };

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = body.folder?.trim() || "";

    // Create parameters payload to sign
    const params: Record<string, string> = {
      timestamp: String(timestamp),
    };
    if (folder) {
      params.folder = folder;
    }

    // Sort parameters alphabetically
    const parameterString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    // Sign the parameter string concatenated with API Secret
    const signature = createHash("sha1")
      .update(`${parameterString}${cloudinaryApiSecret}`)
      .digest("hex");

    return NextResponse.json({
      signature,
      timestamp,
      apiKey: cloudinaryApiKey,
      cloudName: cloudinaryCloudName,
    });
  } catch (error) {
    console.error("Error signing Cloudinary request:", error);
    return NextResponse.json(
      { error: "Impossible de générer la signature Cloudinary." },
      { status: 500 }
    );
  }
}
