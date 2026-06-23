type GuestNameProps = {
  firstName: string;
  lastName: string;
  invitationType: "SINGLE" | "COUPLE";
  plusOneFirstName?: string | null;
  className?: string;
};

/**
 * Formats and displays a guest's name uniformly across the app.
 *
 * - SINGLE  → "Prénom Nom"
 * - COUPLE  → "Couple Prénom & PlusOnePrenom Nom"
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
      ? `Couple ${firstName} & ${plusOneFirstName ?? ""} ${lastName || ""}`.trim()
      : `${firstName} ${lastName}`;

  return <span className={className}>{displayName}</span>;
}
