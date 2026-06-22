import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Missing CLERK_WEBHOOK_SECRET – add it to your .env.local"
    );
  }

  // Get the Svix headers
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify the webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    console.error("Clerk webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const primaryEmail =
      email_addresses.find((e) => e.id === evt.data.primary_email_address_id)
        ?.email_address ?? email_addresses[0]?.email_address;

    if (!primaryEmail) {
      return NextResponse.json(
        { error: "No email address found" },
        { status: 400 }
      );
    }

    await prisma.user.create({
      data: {
        clerkId: id,
        email: primaryEmail,
        name: [first_name, last_name].filter(Boolean).join(" ") || null,
        avatarUrl: image_url ?? null,
      },
    });
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const primaryEmail =
      email_addresses.find((e) => e.id === evt.data.primary_email_address_id)
        ?.email_address ?? email_addresses[0]?.email_address;

    await prisma.user.update({
      where: { clerkId: id },
      data: {
        email: primaryEmail,
        name: [first_name, last_name].filter(Boolean).join(" ") || null,
        avatarUrl: image_url ?? null,
      },
    });
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    if (id) {
      await prisma.user.delete({
        where: { clerkId: id },
      }).catch(() => {
        // User may not exist in DB yet – ignore
      });
    }
  }

  return NextResponse.json({ received: true });
}
