import { ScannerClient } from "@/components/scanner/scanner-client";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function ScannerPage({ params }: Props) {
  const { eventId } = await params;

  return (
    <div className="py-6 lg:py-8">
      <ScannerClient eventId={eventId} />
    </div>
  );
}
