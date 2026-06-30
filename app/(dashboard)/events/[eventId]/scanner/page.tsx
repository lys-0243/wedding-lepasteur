import { ScannerClient } from "@/components/scanner/scanner-client";
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

  return (
    <div className="py-6 lg:py-8">
      <ScannerClient eventId={eventId} />
    </div>
  );
}
