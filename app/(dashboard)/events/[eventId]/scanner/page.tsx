import { ScannerClient } from "@/components/scanner/scanner-client";
import { requireEventAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ eventId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true },
  });
  if (!event) return {};
  return { title: `Scanner — ${event.title}` };
}

export default async function ScannerPage({ params }: Props) {
  const { eventId } = await params;
  await requireEventAccess(eventId, "checkin:read");

  return (
    <div className="py-6 lg:py-8">
      <ScannerClient eventId={eventId} />
    </div>
  );
}
