import { NextResponse } from "next/server";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
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

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

type BinaryInput = Uint8Array | ArrayBuffer | ArrayBufferLike;

function toUint8Array(input: BinaryInput): Uint8Array {
  return input instanceof Uint8Array
    ? input
    : new Uint8Array(input as ArrayBufferLike);
}

async function fetchUploadedInvitation(
  url: string,
): Promise<
  | { type: "pdf"; buffer: Uint8Array }
  | { type: "image"; buffer: Uint8Array; format: "png" | "jpg" }
> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Impossible de charger le fichier d'invitation uploadé.");
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const rawBuffer = toUint8Array(await response.arrayBuffer());

  const isPdf =
    contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf");
  const isPng =
    contentType.includes("png") || url.toLowerCase().endsWith(".png");
  const isJpg =
    contentType.includes("jpeg") ||
    contentType.includes("jpg") ||
    url.toLowerCase().endsWith(".jpg") ||
    url.toLowerCase().endsWith(".jpeg");

  if (isPdf) {
    return { type: "pdf", buffer: rawBuffer };
  }

  if (isPng) {
    return { type: "image", buffer: rawBuffer, format: "png" };
  }

  if (isJpg) {
    return { type: "image", buffer: rawBuffer, format: "jpg" };
  }

  try {
    await PDFDocument.load(rawBuffer);
    return { type: "pdf", buffer: rawBuffer };
  } catch {
    // continue to image detection
  }

  try {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    await pdf.embedJpg(rawBuffer);
    return { type: "image", buffer: rawBuffer, format: "jpg" };
  } catch {
    // continue to PNG
  }

  try {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    await pdf.embedPng(rawBuffer);
    return { type: "image", buffer: rawBuffer, format: "png" };
  } catch {
    throw new Error(
      "Le fichier d'invitation uploadé n'est pas un PDF ou une image supportée.",
    );
  }
}

async function createPdfFromImage(
  imageBuffer: BinaryInput,
  format: "png" | "jpg",
) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  const image =
    format === "png"
      ? await pdfDoc.embedPng(toUint8Array(imageBuffer))
      : await pdfDoc.embedJpg(toUint8Array(imageBuffer));

  const { width, height } = image.scaleToFit(A4_WIDTH - 64, A4_HEIGHT - 64);
  page.drawImage(image, {
    x: 32,
    y: A4_HEIGHT - height - 32,
    width,
    height,
  });

  return new Uint8Array(await pdfDoc.save());
}

async function concatenatePdfs(
  firstPdf: BinaryInput,
  secondPdf: BinaryInput,
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  const firstDoc = await PDFDocument.load(toUint8Array(firstPdf));
  const firstPages = await mergedPdf.copyPages(
    firstDoc,
    firstDoc.getPageIndices(),
  );
  firstPages.forEach((page) => mergedPdf.addPage(page));

  const secondDoc = await PDFDocument.load(toUint8Array(secondPdf));
  const secondPages = await mergedPdf.copyPages(
    secondDoc,
    secondDoc.getPageIndices(),
  );
  secondPages.forEach((page) => mergedPdf.addPage(page));

  return new Uint8Array(await mergedPdf.save());
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
          invitationFileUrl: true,
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

  const generatedBuffer = toUint8Array(await renderToBuffer(pdf));
  let finalBuffer = generatedBuffer;

  if (guest.event.invitationFileUrl) {
    const uploaded = await fetchUploadedInvitation(
      guest.event.invitationFileUrl,
    );
    if (uploaded.type === "pdf") {
      finalBuffer = await concatenatePdfs(uploaded.buffer, generatedBuffer);
    } else {
      const uploadedAsPdf = await createPdfFromImage(
        uploaded.buffer,
        uploaded.format,
      );
      finalBuffer = await concatenatePdfs(uploadedAsPdf, generatedBuffer);
    }
  }

  const filename = `invitation-${fullGuestName.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  return new NextResponse(new Uint8Array(finalBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
