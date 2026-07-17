import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId } = await params;

  const { searchParams } = new URL(_req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token manquant." }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { userId: true, title: true },
  });

  if (!event || event.userId !== user.id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const guest = await prisma.guest.findUnique({
    where: { token },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      checkedInAt: true,
      eventId: true,
      invitationType: true,
      plusOneRsvpStatus: true,
      table: { select: { name: true } },
    },
  });

  if (!guest || guest.eventId !== eventId) {
    return NextResponse.json(
      { error: "Invité introuvable pour cet événement." },
      { status: 404 },
    );
  }

  const displayName =
    guest.invitationType === "COUPLE"
      ? `Couple ${guest.firstName} ${guest.lastName}`.trim()
      : `${guest.firstName} ${guest.lastName}`.trim();

  const now = new Date();
  const isPair =
    guest.invitationType === "COUPLE" || guest.invitationType === "DUO";
  await prisma.guest.update({
    where: { id: guest.id },
    data: {
      checkedInAt: now,
      rsvpStatus: "PRESENT",
      ...(isPair ? { plusOneRsvpStatus: "PRESENT" } : {}),
    },
  });

  const timeStr = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Check-in confirmé</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f4f6fb;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 1.5rem;
      padding: 2rem;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 18px 60px rgba(137,126,201,0.15);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
      font-size: 2rem;
      color: white;
    }
    h1 { font-size: 1.5rem; color: #0f172a; margin-bottom: 0.5rem; }
    p { color: #475569; font-size: 0.95rem; line-height: 1.5; }
    .name { font-weight: 700; color: #0f172a; }
    .time { margin-top: 1rem; font-size: 0.85rem; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Présence confirmée</h1>
    <p><span class="name">${displayName}</span> est bien arrivé à <strong>${event.title}</strong>.</p>
    <p class="time">Enregistré à ${timeStr}</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId } = await params;

  const { token } = (await req.json()) as { token?: string };

  if (!token) {
    return NextResponse.json({ error: "Token manquant." }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { userId: true },
  });

  if (!event || event.userId !== user.id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const guest = await prisma.guest.findUnique({
    where: { token },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      invitationType: true,
      checkedInAt: true,
      eventId: true,
      plusOneRsvpStatus: true,
      table: { select: { name: true } },
    },
  });

  if (!guest || guest.eventId !== eventId) {
    return NextResponse.json(
      { error: "Invité introuvable pour cet événement." },
      { status: 404 },
    );
  }

  const now = new Date();
  const isPair =
    guest.invitationType === "COUPLE" || guest.invitationType === "DUO";

  // #region agent log
  let runtimeEnumKeys: string[] = [];
  try {
    const enums = await import("@/generated/prisma/enums");
    runtimeEnumKeys = Object.keys(enums.RsvpStatus ?? {});
  } catch (e) {
    runtimeEnumKeys = [`import_error:${e instanceof Error ? e.message : "unknown"}`];
  }
  let dbEnumLabels: string[] = [];
  try {
    const rows = await prisma.$queryRaw<{ enumlabel: string }[]>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'RsvpStatus'
      ORDER BY e.enumsortorder
    `;
    dbEnumLabels = rows.map((r) => r.enumlabel);
  } catch (e) {
    dbEnumLabels = [`query_error:${e instanceof Error ? e.message : "unknown"}`];
  }
  fetch("http://127.0.0.1:7430/ingest/45199c7f-b5a3-42d4-93dd-ac60f6b59c53", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "6b3bde",
    },
    body: JSON.stringify({
      sessionId: "6b3bde",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "checkin/route.ts:POST:pre-update",
      message: "Check-in about to set PRESENT",
      data: {
        runtimeEnumKeys,
        runtimeHasPresent: runtimeEnumKeys.includes("PRESENT"),
        dbEnumLabels,
        dbHasPresent: dbEnumLabels.includes("PRESENT"),
        isPair,
        invitationType: guest.invitationType,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  try {
    await prisma.guest.update({
      where: { id: guest.id },
      data: {
        checkedInAt: now,
        rsvpStatus: "PRESENT",
        ...(isPair ? { plusOneRsvpStatus: "PRESENT" } : {}),
      },
    });
  } catch (err) {
    // #region agent log
    fetch("http://127.0.0.1:7430/ingest/45199c7f-b5a3-42d4-93dd-ac60f6b59c53", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "6b3bde",
      },
      body: JSON.stringify({
        sessionId: "6b3bde",
        runId: "pre-fix",
        hypothesisId: "B",
        location: "checkin/route.ts:POST:update-error",
        message: "Check-in update failed",
        data: {
          errorName: err instanceof Error ? err.name : "unknown",
          errorMessage: err instanceof Error ? err.message.slice(0, 500) : String(err),
          runtimeHasPresent: runtimeEnumKeys.includes("PRESENT"),
          dbHasPresent: dbEnumLabels.includes("PRESENT"),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw err;
  }

  // #region agent log
  fetch("http://127.0.0.1:7430/ingest/45199c7f-b5a3-42d4-93dd-ac60f6b59c53", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "6b3bde",
    },
    body: JSON.stringify({
      sessionId: "6b3bde",
      runId: "pre-fix",
      hypothesisId: "C",
      location: "checkin/route.ts:POST:success",
      message: "Check-in update succeeded",
      data: { guestId: guest.id, rsvpStatus: "PRESENT" },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const displayName =
    guest.invitationType === "COUPLE"
      ? `Couple ${guest.firstName} ${guest.lastName}`.trim()
      : `${guest.firstName} ${guest.lastName}`.trim();

  return NextResponse.json({
    success: true,
    guest: {
      name: displayName,
      tableName: guest.table?.name ?? null,
      checkedInAt: now.toISOString(),
      rsvpStatus: "PRESENT",
    },
  });
}
