import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar, MobileNavSheet } from "./sidebar";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

export default async function EventLayout({ children, params }: LayoutProps) {
  const user = await requireUser();
  const { eventId } = await params;

  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: user.id },
    select: { id: true, title: true },
  });

  if (!event) notFound();

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
      {/* ── Mobile nav sheet ── */}
      <MobileNavSheet
        eventId={event.id}
        eventTitle={event.title}
        user={{
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl ?? null,
        }}
      />

      {/* ── Desktop sidebar ── */}
      <Sidebar
        className="hidden lg:flex"
        eventId={event.id}
        eventTitle={event.title}
        user={{
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl ?? null,
        }}
      />

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
