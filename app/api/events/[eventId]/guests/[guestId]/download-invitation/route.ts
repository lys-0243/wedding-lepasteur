import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { readFile } from "fs/promises";
import path from "path";
import * as QRCode from "qrcode";

type RouteContext = {
  params: Promise<{ eventId: string; guestId: string }>;
};

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

function toUint8Array(input: Uint8Array | ArrayBuffer): Uint8Array {
  return input instanceof Uint8Array
    ? input
    : new Uint8Array(input as ArrayBuffer);
}

async function loadInvitationFile(
  url: string,
): Promise<Uint8Array | null> {
  try {
    if (url.startsWith("/invitations/")) {
      const filePath = path.join(process.cwd(), "public", url);
      const buffer = await readFile(filePath);
      return toUint8Array(buffer);
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    return toUint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

type Placeholder = {
  pageIndex: number;
  type: "NOM" | "TABLE";
  x: number;
  y: number;
  fontSize: number;
};

async function findPlaceholders(
  buffer: Uint8Array,
): Promise<{ doc: PDFDocument; placeholders: Placeholder[] }> {
  const pdfjsLib = await import("pdfjs-dist");
  const pdf = await pdfjsLib.getDocument({
    data: buffer.slice(0),
  }).promise;

  const placeholders: Placeholder[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      const data = item as any;
      const str = data.str?.trim()?.toUpperCase();
      if (str !== "NOM" && str !== "TABLE") continue;

      const [, , , , e, f] = data.transform;
      const fontSize =
        typeof data.height === "number" && data.height > 0
          ? data.height
          : Math.abs(data.transform[0]);

      placeholders.push({
        pageIndex: i - 1,
        type: str as "NOM" | "TABLE",
        x: e,
        y: f,
        fontSize,
      });
    }
  }

  try { (pdf as any).destroy?.(); } catch {} // eslint-disable-line

  const pdfDoc = await PDFDocument.load(buffer);
  return { doc: pdfDoc, placeholders };
}

async function replacePlaceholders(
  pdfDoc: PDFDocument,
  placeholders: Placeholder[],
  guestName: string,
  tableName: string | null,
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const ph of placeholders) {
    const page = pdfDoc.getPages()[ph.pageIndex];
    if (!page) continue;

    const value = ph.type === "NOM" ? guestName : (tableName ?? "");
    if (!value) continue;

    page.drawText(value, {
      x: ph.x,
      y: ph.y,
      size: ph.fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  }
}

async function createQrCodePage(
  checkinUrl: string,
  guestName: string,
  tableName: string | null,
): Promise<Uint8Array> {
  const qrPngBuffer = await QRCode.toBuffer(checkinUrl, {
    width: 300,
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  const qrImage = await pdfDoc.embedPng(toUint8Array(qrPngBuffer));
  const qrSize = 250;
  const qrX = (A4_WIDTH - qrSize) / 2;
  const qrY = (A4_HEIGHT - qrSize) / 2 + 40;

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const titleSize = 18;
  const title = "Scannez ce code pour valider votre presence";
  const titleWidth = font.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (A4_WIDTH - titleWidth) / 2,
    y: qrY - 50,
    size: titleSize,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  const nameSize = 14;
  const nameText = `Invite: ${guestName}`;
  const nameWidth = boldFont.widthOfTextAtSize(nameText, nameSize);
  page.drawText(nameText, {
    x: (A4_WIDTH - nameWidth) / 2,
    y: qrY + qrSize + 30,
    size: nameSize,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  if (tableName) {
    const tableSize = 12;
    const tableText = `Table: ${tableName}`;
    const tableWidth = font.widthOfTextAtSize(tableText, tableSize);
    page.drawText(tableText, {
      x: (A4_WIDTH - tableWidth) / 2,
      y: qrY + qrSize + 10,
      size: tableSize,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return toUint8Array(await pdfDoc.save());
}

async function concatenatePdfs(
  firstPdf: Uint8Array,
  secondPdf: Uint8Array,
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  const firstDoc = await PDFDocument.load(firstPdf);
  const firstPages = await mergedPdf.copyPages(
    firstDoc,
    firstDoc.getPageIndices(),
  );
  firstPages.forEach((page) => mergedPdf.addPage(page));

  const secondDoc = await PDFDocument.load(secondPdf);
  const secondPages = await mergedPdf.copyPages(
    secondDoc,
    secondDoc.getPageIndices(),
  );
  secondPages.forEach((page) => mergedPdf.addPage(page));

  return toUint8Array(await mergedPdf.save());
}

export async function GET(_req: Request, { params }: RouteContext) {
  const user = await requireUser();
  const { eventId, guestId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, userId: true },
  });

  if (!event) {
    return NextResponse.json(
      { error: "Événement introuvable." },
      { status: 404 },
    );
  }

  if (event.userId !== user.id) {
    return NextResponse.json(
      { error: "Non autorisé." },
      { status: 403 },
    );
  }

  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      invitationType: true,
      token: true,
      table: { select: { name: true } },
      event: {
        select: { invitationFileUrl: true, title: true, slug: true },
      },
    },
  });

  if (!guest || guest.event === null) {
    return NextResponse.json(
      { error: "Invité introuvable." },
      { status: 404 },
    );
  }

  const checkinUrl = `${new URL(_req.url).origin}/api/events/${eventId}/checkin?token=${guest.token}`;
  const displayName = guest.invitationType === "COUPLE"
    ? `Couple ${guest.firstName} ${guest.lastName}`.trim()
    : `${guest.firstName} ${guest.lastName}`.trim();
  const guestName = `${guest.firstName} ${guest.lastName}`.trim();
  const tableName = guest.table?.name ?? null;

  const qrPage = await createQrCodePage(checkinUrl, displayName, tableName);

  let finalPdf: Uint8Array;

  if (guest.event.invitationFileUrl) {
    const invitationBuffer = await loadInvitationFile(
      guest.event.invitationFileUrl,
    );

    if (invitationBuffer) {
      try {
        let modifiedBuffer = invitationBuffer;

        try {
          const { doc, placeholders } = await findPlaceholders(invitationBuffer);
          if (placeholders.length > 0) {
            await replacePlaceholders(doc, placeholders, displayName, tableName);
            modifiedBuffer = toUint8Array(await doc.save());
          }
        } catch {
          // pdfjs-dist failed; proceed with original buffer
        }

        const invitationDoc = await PDFDocument.load(modifiedBuffer);
        const isPdf = invitationDoc.getPageCount() > 0;
        if (isPdf) {
          finalPdf = await concatenatePdfs(modifiedBuffer, qrPage);
        } else {
          finalPdf = qrPage;
        }
      } catch {
        try {
          const imgPdf = await PDFDocument.create();
          const imgPage = imgPdf.addPage([A4_WIDTH, A4_HEIGHT]);
          let embedded: any;
          try {
            embedded = await imgPdf.embedJpg(invitationBuffer);
          } catch {
            embedded = await imgPdf.embedPng(invitationBuffer);
          }
          const { width, height } = embedded.scaleToFit(A4_WIDTH - 64, A4_HEIGHT - 64);
          imgPage.drawImage(embedded, {
            x: 32,
            y: A4_HEIGHT - height - 32,
            width,
            height,
          });
          const imgPdfBytes = toUint8Array(await imgPdf.save());
          finalPdf = await concatenatePdfs(imgPdfBytes, qrPage);
        } catch {
          finalPdf = qrPage;
        }
      }
    } else {
      finalPdf = qrPage;
    }
  } else {
    finalPdf = qrPage;
  }

  const filename = `invitation-${guestName.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  return new NextResponse(Buffer.from(finalPdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
