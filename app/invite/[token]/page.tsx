import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const guest = await prisma.guest.findUnique({
    where: { token: params.token },
    select: {
      event: {
        select: {
          title: true,
          venue: true,
          description: true,
          coverImageUrl: true,
        },
      },
    },
  });

  if (!guest?.event) {
    return {
      title: "Invitation",
      description: "Accédez à votre invitation de mariage.",
    };
  }

  return {
    title: guest.event.title,
    description:
      guest.event.description ??
      guest.event.venue ??
      "Accédez à votre invitation de mariage.",
    openGraph: {
      title: guest.event.title,
      description:
        guest.event.description ?? guest.event.venue ?? "Invitation au mariage",
      images: guest.event.coverImageUrl
        ? [{ url: guest.event.coverImageUrl }]
        : undefined,
    },
  };
}

export default async function InviteTokenPage({
  params,
}: {
  params: { token: string };
}) {
  redirect(`/invite/${params.token}/confirmation`);
}
