import Link from "next/link";

export default function EditLink({ eventId }: { eventId: string }) {
  return (
    <Link
      href={`/events/${eventId}/edit`}
      className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-slate-50"
    >
      Modifier l'événement
    </Link>
  );
}
