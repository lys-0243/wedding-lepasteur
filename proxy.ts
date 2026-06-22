import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-utils";

const isPublicRoute = (path: string) => {
  const publicPaths = [
    "/sign-in",
    "/sign-up",
    "/invite/",
    "/api/invite/",
    "/api/imagekit/auth",
  ];
  return publicPaths.some((p) => path.startsWith(p));
};

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (isPublicRoute(path)) {
    return NextResponse.next();
  }

  const session = request.cookies.get("session")?.value;

  if (!session) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  const jwtSecret = process.env.JWT_SECRET || "fallback_secret_at_least_32_chars_long";
  const payload = await verifyToken(session, jwtSecret);

  if (!payload) {
    const signInUrl = new URL("/sign-in", request.url);
    const response = NextResponse.redirect(signInUrl);
    response.cookies.delete("session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
