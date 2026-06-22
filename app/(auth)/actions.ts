"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth-utils";
import { hashPassword, verifyPassword } from "@/lib/password-utils";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_at_least_32_chars_long";

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Veuillez remplir tous les champs." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return { error: "Identifiants incorrects." };
    }

    const isPasswordCorrect = verifyPassword(password, user.passwordHash);

    if (!isPasswordCorrect) {
      return { error: "Identifiants incorrects." };
    }

    // Sign session token (expires in 7 days)
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const token = await signToken({ userId: user.id, exp: expiresAt }, JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(expiresAt),
      sameSite: "lax",
      path: "/",
    });
  } catch (error) {
    console.error("Error in loginAction:", error);
    return { error: "Une erreur est survenue lors de la connexion." };
  }

  redirect("/");
}

export async function signupAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("passwordConfirm") as string;
  const name = formData.get("name") as string;
  const avatarUrl = formData.get("avatarUrl") as string;

  if (!email || !password || !passwordConfirm) {
    return { error: "Veuillez remplir tous les champs obligatoires (email, mot de passe, confirmation)." };
  }

  if (password !== passwordConfirm) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return { error: "Cette adresse email est déjà utilisée." };
    }

    const passwordHash = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name?.trim() || null,
        avatarUrl: avatarUrl || null,
      },
    });

    // Sign session token (expires in 7 days)
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const token = await signToken({ userId: user.id, exp: expiresAt }, JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(expiresAt),
      sameSite: "lax",
      path: "/",
    });
  } catch (error) {
    console.error("Error in signupAction:", error);
    return { error: "Une erreur est survenue lors de l'inscription." };
  }

  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/sign-in");
}
