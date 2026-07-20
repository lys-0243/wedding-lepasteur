"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password-utils";

export type ProfileActionState = {
  error?: string;
  success?: string;
} | null;

export async function updateProfileAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const newPasswordConfirm = String(formData.get("newPasswordConfirm") ?? "");

  if (!email) {
    return { error: "L'adresse email est obligatoire." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Adresse email invalide." };
  }

  const wantsPasswordChange = Boolean(
    newPassword || newPasswordConfirm || currentPassword,
  );

  if (wantsPasswordChange) {
    if (!currentPassword) {
      return {
        error: "Indiquez votre mot de passe actuel pour le modifier.",
      };
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return { error: "Mot de passe actuel incorrect." };
    }
    if (newPassword.length < 6) {
      return {
        error: "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      };
    }
    if (newPassword !== newPasswordConfirm) {
      return { error: "Les nouveaux mots de passe ne correspondent pas." };
    }
  }

  try {
    if (email !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing && existing.id !== user.id) {
        return { error: "Cette adresse email est déjà utilisée." };
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || null,
        email,
        avatarUrl: avatarUrl || null,
        ...(wantsPasswordChange
          ? { passwordHash: hashPassword(newPassword) }
          : {}),
      },
    });

    revalidatePath("/profile");
    revalidatePath("/");
    revalidatePath("/events", "layout");

    return {
      success: wantsPasswordChange
        ? "Profil et mot de passe mis à jour."
        : "Profil mis à jour.",
    };
  } catch (error) {
    console.error("Error in updateProfileAction:", error);
    return { error: "Une erreur est survenue lors de la mise à jour." };
  }
}
