import { getPermissions, requireEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Sidebar, MobileNavSheet } from "./sidebar";
import type { Metadata } from "next";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true },
  });
  if (!event) return {};
  return { title: event.title };
}

export default async function EventLayout({ children, params }: LayoutProps) {
  const { eventId } = await params;
  const { user, event, membership } = await requireEventAccess(
    eventId,
    "event:read",
  );
  const permissions = getPermissions(membership.role);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
      <MobileNavSheet
        eventId={event.id}
        eventTitle={event.title}
        permissions={permissions}
        user={{
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl ?? null,
        }}
      />

      <Sidebar
        className="hidden lg:flex"
        eventId={event.id}
        eventTitle={event.title}
        permissions={permissions}
        user={{
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl ?? null,
        }}
      />

      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
