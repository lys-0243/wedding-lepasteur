import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-utils";

const JWT_SECRET =
  process.env.JWT_SECRET ?? "fallback_secret_at_least_32_chars_long";

/** Routes accessibles sans être connecté */
const PUBLIC_PATHS = [
  "/sign-in",
  "/sign-up",
  "/invite/",
  "/api/invite/",
  "/api/auth/",
];

/** Routes réservées aux visiteurs non connectés (rediriger si connecté) */
const GUEST_ONLY_PATHS = ["/sign-in", "/sign-up"];

const startsWith = (path: string, list: string[]) =>
  list.some((p) => path.startsWith(p));

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const session = request.cookies.get("session")?.value;

  // Vérifie la validité du token si présent
  const payload = session ? await verifyToken(session, JWT_SECRET) : null;

  // ── Visiteur connecté sur une page "guest only" → dashboard ──────────
  if (payload && startsWith(path, GUEST_ONLY_PATHS)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ── Route publique → laisser passer ──────────────────────────────────
  if (startsWith(path, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  // ── Route protégée sans session → login ──────────────────────────────
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // ── Session invalide/expirée → login + suppression du cookie ─────────
  if (!payload) {
    const res = NextResponse.redirect(new URL("/sign-in", request.url));
    res.cookies.delete("session");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
