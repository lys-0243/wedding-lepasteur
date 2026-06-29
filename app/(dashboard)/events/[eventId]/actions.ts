"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { unlink } from "fs/promises";
import path from "path";

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

export async function updateEventAction(formData: FormData) {
  const user = await requireUser();

  const eventIdValue = formData.get("eventId");
  const eventId = typeof eventIdValue === "string" ? eventIdValue : null;

  if (!eventId) {
    throw new Error("Event id manquant.");
  }

  const existing = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, userId: true, invitationFileUrl: true },
  });

  if (!existing) {
    throw new Error("Événement introuvable.");
  }

  if (existing.userId !== user.id) {
    throw new Error("Non autorisé.");
  }

  const titleValue = formData.get("title");
  const title = typeof titleValue === "string" ? titleValue.trim() : "";

  if (!title) {
    throw new Error("Le nom de l'evenement est requis.");
  }

  const rawSelectedDrinkIds = formData.get("selectedDrinkIds");
  let selectedDrinkIds: string[] = [];
  if (typeof rawSelectedDrinkIds === "string" && rawSelectedDrinkIds.trim()) {
    try {
      const parsed = JSON.parse(rawSelectedDrinkIds) as unknown;
      if (Array.isArray(parsed)) {
        selectedDrinkIds = parsed
          .filter(
            (id): id is string =>
              typeof id === "string" && id.trim().length > 0,
          )
          .map((id) => id.trim());
      }
    } catch {
      selectedDrinkIds = [];
    }
  }

  const distinctSelectedDrinkIds = [...new Set(selectedDrinkIds)];

  const newInvitationFileUrl = asOptionalText(
    formData.get("invitationFileUrl"),
  );

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      eventDate: asOptionalDate(formData.get("eventDate")),
      startTime: asOptionalText(formData.get("startTime")),
      venue: asOptionalText(formData.get("venue")),
      description: asOptionalText(formData.get("description")),
      profileImageUrl: asOptionalText(formData.get("profileImageUrl")),
      coverImageUrl: asOptionalText(formData.get("coverImageUrl")),
      invitationFileUrl: newInvitationFileUrl,
      eventDrinks:
        distinctSelectedDrinkIds.length > 0
          ? {
              deleteMany: {},
              createMany: {
                data: distinctSelectedDrinkIds.map((drinkId) => ({ drinkId })),
                skipDuplicates: true,
              },
            }
          : { deleteMany: {} },
    },
  });

  const oldUrl = existing.invitationFileUrl;
  if (oldUrl && oldUrl.startsWith("/invitations/") && oldUrl !== newInvitationFileUrl) {
    const filePath = path.join(process.cwd(), "public", oldUrl);
    await unlink(filePath).catch(() => {});
  }

  redirect(`/events/${eventId}`);
}
