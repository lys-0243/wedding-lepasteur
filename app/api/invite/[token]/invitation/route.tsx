import { NextResponse } from "next/server";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ token: string }> };

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 12,
    color: "#0f172a",
  },
  title: {
    fontSize: 22,
    marginBottom: 10,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    color: "#475569",
  },
  block: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
  },
  label: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 4,
  },
  value: {
    fontSize: 13,
    fontWeight: 600,
  },
});

function InvitationPdf({
  eventTitle,
  eventDate,
  venue,
  guestName,
  plusOneName,
}: {
  eventTitle: string;
  eventDate: string;
  venue: string;
  guestName: string;
  plusOneName: string | null;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Invitation</Text>
        <Text style={styles.subtitle}>{eventTitle}</Text>

        <View style={styles.block}>
          <Text style={styles.label}>Invite</Text>
          <Text style={styles.value}>{guestName}</Text>
          {plusOneName ? (
            <Text style={styles.value}>+ {plusOneName}</Text>
          ) : null}
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{eventDate}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Lieu</Text>
          <Text style={styles.value}>{venue || "A definir"}</Text>
        </View>

        <Text style={styles.subtitle}>
          Merci de confirmer votre presence via votre lien d'invitation.
        </Text>
      </Page>
    </Document>
  );
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { token } = await params;

  const guest = await prisma.guest.findUnique({
    where: { token },
    select: {
      firstName: true,
      lastName: true,
      plusOneFirstName: true,
      plusOneLastName: true,
      event: {
        select: {
          title: true,
          eventDate: true,
          venue: true,
        },
      },
    },
  });

  if (!guest) {
    return NextResponse.json(
      { error: "Invitation introuvable." },
      { status: 404 },
    );
  }

  const fullGuestName = `${guest.firstName} ${guest.lastName}`.trim();
  const plusOneName =
    `${guest.plusOneFirstName ?? ""} ${guest.plusOneLastName ?? ""}`.trim();
  const formattedDate = guest.event.eventDate
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(guest.event.eventDate)
    : "Date a definir";

  const pdf = (
    <InvitationPdf
      eventTitle={guest.event.title}
      eventDate={formattedDate}
      venue={guest.event.venue ?? ""}
      guestName={fullGuestName}
      plusOneName={plusOneName.length > 0 ? plusOneName : null}
    />
  );

  const buffer = await renderToBuffer(pdf);
  const filename = `invitation-${fullGuestName.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
