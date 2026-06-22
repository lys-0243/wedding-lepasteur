"use server";

import { redirect } from "next/navigation";
import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function asOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function createUniqueSlug(baseTitle: string) {
  const baseSlug =
    slugify(baseTitle, { lower: true, strict: true, trim: true }) ||
    `event-${Date.now()}`;

  let nextSlug = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await prisma.event.findUnique({
      where: { slug: nextSlug },
      select: { id: true },
    });

    if (!existing) {
      return nextSlug;
    }

    suffix += 1;
    nextSlug = `${baseSlug}-${suffix}`;
  }
}

export async function createEventAction(formData: FormData) {
  const user = await requireUser();

  const titleValue = formData.get("title");
  const title = typeof titleValue === "string" ? titleValue.trim() : "";

  if (!title) {
    throw new Error("Le nom de l'evenement est requis.");
  }

  const slug = await createUniqueSlug(title);

  await prisma.event.create({
    data: {
      userId: user.id,
      title,
      slug,
      eventDate: asOptionalDate(formData.get("eventDate")),
      venue: asOptionalText(formData.get("venue")),
      description: asOptionalText(formData.get("description")),
      profileImageUrl: asOptionalText(formData.get("profileImageUrl")),
      coverImageUrl: asOptionalText(formData.get("coverImageUrl")),
    },
  });

  redirect("/");
}
