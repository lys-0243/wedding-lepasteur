type GuestNameProps = {
  firstName: string;
  lastName: string;
  invitationType: "SINGLE" | "COUPLE" | "DUO";
  plusOneFirstName?: string | null;
  className?: string;
};

/**
 * Formats and displays a guest's name uniformly across the app.
 *
 * - SINGLE  → "Prénom Nom" (1 seat)
 * - COUPLE  → "Couple Prénom Nom" (2 seats)
 * - DUO     → "Prénom Nom" (2 seats)
 */
export function GuestName({
  firstName,
  lastName,
  invitationType,
  plusOneFirstName,
  className = "text-sm font-semibold text-slate-800 truncate",
}: GuestNameProps) {
  const displayName =
    invitationType === "COUPLE"
      ? `Couple ${firstName} ${lastName}`.trim()
      : `${firstName} ${lastName}`;

  return <span className={className}>{displayName}</span>;
}
