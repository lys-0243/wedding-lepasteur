import "server-only";

import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  can,
  type EventRole,
  type Permission,
} from "@/lib/event-permissions";

export type { EventRole, Permission } from "@/lib/event-permissions";
export {
  can,
  getPermissions,
  EVENT_ROLE_LABELS,
  STAFF_ROLES,
} from "@/lib/event-permissions";

export async function getEventMembership(userId: string, eventId: string) {
  const membership = await prisma.eventMember.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          userId: true,
          slug: true,
          status: true,
        },
      },
    },
  });

  if (membership) return membership;

  // Fallback: event creator is treated as OWNER even without EventMember row
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      userId: true,
      slug: true,
      status: true,
    },
  });

  if (!event || event.userId !== userId) return null;

  return {
    id: `owner-fallback-${eventId}`,
    eventId,
    userId,
    role: "OWNER" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    event,
  };
}

export async function requireEventAccess(
  eventId: string,
  permission: Permission,
) {
  const user = await requireUser();
  const membership = await getEventMembership(user.id, eventId);

  if (!membership || !can(membership.role as EventRole, permission)) {
    notFound();
  }

  return { user, event: membership.event, membership };
}

export async function requireEventAccessApi(
  eventId: string,
  permission: Permission,
) {
  const user = await requireUser();
  const membership = await getEventMembership(user.id, eventId);

  if (!membership || !can(membership.role as EventRole, permission)) {
    return {
      denied: NextResponse.json({ error: "Non autorisé." }, { status: 403 }),
    } as const;
  }

  return { user, event: membership.event, membership } as const;
}
