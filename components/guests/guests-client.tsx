"use client";

import { useState, useTransition } from "react";
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Clock,
  Armchair,
  Heart,
  User,
  Pencil,
  Trash2,
  Eye,
  X,
  Calendar,
  Phone,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { GuestName } from "@/components/guests/guest-name";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type GuestTable = { id: string; name: string } | null;

type Guest = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  invitationType: "SINGLE" | "COUPLE";
  plusOneFirstName: string | null;
  plusOneLastName: string | null;
  rsvpStatus: "PENDING" | "CONFIRMED" | "DECLINED";
  plusOneRsvpStatus: "PENDING" | "CONFIRMED" | "DECLINED" | null;
  respondedAt: string | null;
  createdAt: string;
  table: GuestTable;
};

type Props = {
  eventId: string;
  initialGuests: Guest[];
};

const RSVP_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  DECLINED: "Décliné",
};

const RSVP_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  DECLINED: "bg-red-50 text-red-600 border border-red-200",
};

const RSVP_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3 w-3" />,
  CONFIRMED: <UserCheck className="h-3 w-3" />,
  DECLINED: <UserX className="h-3 w-3" />,
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function GuestsClient({ eventId, initialGuests }: Props) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [, startTransition] = useTransition();

  // ── View dialog ────────────────────────────────────────────────────────────
  const [viewGuest, setViewGuest] = useState<Guest | null>(null);

  // ── Edit dialog ────────────────────────────────────────────────────────────
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editInvitationType, setEditInvitationType] = useState<"SINGLE" | "COUPLE">("SINGLE");
  const [editPlusOneFirstName, setEditPlusOneFirstName] = useState("");
  const [editPlusOneLastName, setEditPlusOneLastName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // ── Delete dialog ──────────────────────────────────────────────────────────
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Counts ─────────────────────────────────────────────────────────────────
  const confirmed = guests.filter((g) => g.rsvpStatus === "CONFIRMED").length;
  const declined = guests.filter((g) => g.rsvpStatus === "DECLINED").length;
  const pending = guests.filter((g) => g.rsvpStatus === "PENDING").length;

  const totalAttendees = guests.reduce(
    (sum, g) => sum + (g.invitationType === "COUPLE" ? 2 : 1),
    0
  );

  // ── Filters ────────────────────────────────────────────────────────────────
  const filtered = guests.filter((g) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      g.firstName.toLowerCase().includes(q) ||
      g.lastName.toLowerCase().includes(q) ||
      (g.email ?? "").toLowerCase().includes(q) ||
      (g.plusOneFirstName ?? "").toLowerCase().includes(q) ||
      (g.plusOneLastName ?? "").toLowerCase().includes(q) ||
      (g.table?.name ?? "").toLowerCase().includes(q);

    const matchStatus =
      statusFilter === "ALL" || g.rsvpStatus === statusFilter;

    return matchSearch && matchStatus;
  });

  const statChips = [
    { key: "ALL", label: "Tous", count: guests.length, color: "text-slate-700" },
    { key: "CONFIRMED", label: "Confirmés", count: confirmed, color: "text-emerald-600" },
    { key: "PENDING", label: "En attente", count: pending, color: "text-amber-600" },
    { key: "DECLINED", label: "Déclinés", count: declined, color: "text-red-600" },
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openEdit(guest: Guest) {
    setEditGuest(guest);
    setEditFirstName(guest.firstName);
    setEditLastName(guest.lastName);
    setEditEmail(guest.email || "");
    setEditPhone(guest.phone || "");
    setEditInvitationType(guest.invitationType);
    setEditPlusOneFirstName(guest.plusOneFirstName || "");
    setEditPlusOneLastName(guest.plusOneLastName || "");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editGuest) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests/${editGuest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          phone: editPhone,
          invitationType: editInvitationType,
          plusOneFirstName: editInvitationType === "COUPLE" ? editPlusOneFirstName : "",
          plusOneLastName: editInvitationType === "COUPLE" ? editPlusOneLastName : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la modification.");
        return;
      }
      setGuests((prev) =>
        prev
          .map((g) => (g.id === data.id ? data : g))
          .sort((a, b) => a.lastName.localeCompare(b.lastName))
      );
      setEditGuest(null);
      toast.success("Invité mis à jour.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteGuest) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests/${deleteGuest.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Erreur lors de la suppression.");
        return;
      }
      setGuests((prev) => prev.filter((g) => g.id !== deleteGuest.id));
      toast.success(`${deleteGuest.firstName} ${deleteGuest.lastName} a été supprimé.`);
      setDeleteGuest(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 lg:text-2xl">
            Invités
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {guests.length} fiche{guests.length !== 1 ? "s" : ""} · {totalAttendees} personne
            {totalAttendees !== 1 ? "s" : ""} au total
          </p>
        </div>
      </div>

      {/* ── Stat chips ──────────────────────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap gap-2">
        {statChips.map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => startTransition(() => setStatusFilter(key))}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
              statusFilter === key
                ? "bg-[#534AB7] text-white shadow-sm"
                : "bg-white border border-[#E8ECF4] text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span className={statusFilter === key ? "text-white" : color}>
              {count}
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="mt-4 flex items-center gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Rechercher un invité…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-[#E8ECF4] bg-white text-sm shadow-sm h-10 rounded-xl focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Effacer
          </button>
        )}
      </div>

      {/* ── List ────────────────────────────────────────────────────────── */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#E8ECF4] bg-white shadow-sm">
        {/* Table head */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] items-center border-b border-[#E8ECF4] bg-slate-50/60 px-5 py-3 text-[0.7rem] font-bold uppercase tracking-widest text-slate-400">
          <span>Invité</span>
          <span>Type</span>
          <span>Table</span>
          <span>Statut RSVP</span>
          <span className="text-center">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Users className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {search || statusFilter !== "ALL"
                ? "Aucun invité ne correspond à votre recherche."
                : "Aucun invité pour cet événement."}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((guest, i) => (
              <li
                key={guest.id}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_100px] items-center gap-2 px-5 py-3.5 transition-colors hover:bg-slate-50/60 ${
                  i !== filtered.length - 1 ? "border-b border-[#E8ECF4]" : ""
                }`}
              >
                {/* Name */}
                <div className="min-w-0">
                  <GuestName
                    firstName={guest.firstName}
                    lastName={guest.lastName}
                    invitationType={guest.invitationType}
                    plusOneFirstName={guest.plusOneFirstName}
                  />
                  {guest.email && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {guest.email}
                    </p>
                  )}
                </div>

                {/* Type */}
                <div>
                  {guest.invitationType === "COUPLE" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-pink-600 bg-pink-50 border border-pink-200 rounded-lg px-2 py-0.5">
                      <Heart className="h-2.5 w-2.5" />
                      Couple
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5">
                      <User className="h-2.5 w-2.5" />
                      Seul(e)
                    </span>
                  )}
                </div>

                {/* Table */}
                <div>
                  {guest.table ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1E5FF5] bg-blue-50 border border-blue-200 rounded-lg px-2 py-0.5 truncate max-w-[120px]">
                      <Armchair className="h-2.5 w-2.5 shrink-0" />
                      {guest.table.name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>

                {/* RSVP status */}
                <div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2 py-0.5 ${
                      RSVP_STYLES[guest.rsvpStatus]
                    }`}
                  >
                    {RSVP_ICONS[guest.rsvpStatus]}
                    {RSVP_LABELS[guest.rsvpStatus]}
                  </span>
                  {guest.invitationType === "COUPLE" &&
                    guest.plusOneRsvpStatus && (
                      <span
                        className={`mt-0.5 block inline-flex items-center gap-1 text-[10px] font-medium rounded-lg px-1.5 py-0.5 ${
                          RSVP_STYLES[guest.plusOneRsvpStatus]
                        }`}
                      >
                        {RSVP_ICONS[guest.plusOneRsvpStatus]}
                        +1 {RSVP_LABELS[guest.plusOneRsvpStatus]}
                      </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => setViewGuest(guest)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#EEF0FF] hover:text-[#1E5FF5]"
                    title="Voir le détail"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openEdit(guest)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#EEF0FF] hover:text-[#1E5FF5]"
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteGuest(guest)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          View Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!viewGuest} onOpenChange={(o) => !o && setViewGuest(null)}>
        <DialogContent className="max-w-md w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-5">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Détail de l&apos;invité
            </DialogTitle>
          </DialogHeader>

          {viewGuest && (
            <div className="space-y-4">
              {/* Name block */}
              <div className="rounded-xl bg-[#F4F6FB] px-4 py-3 space-y-1">
                <p className="text-base font-bold text-slate-800">
                  {viewGuest.firstName} {viewGuest.lastName}
                </p>
                {viewGuest.invitationType === "COUPLE" && (
                  <p className="text-sm text-pink-600 flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 shrink-0" />
                    Couple avec {viewGuest.plusOneFirstName || ""} {viewGuest.plusOneLastName || ""}
                  </p>
                )}
              </div>

              {/* Contact */}
              <div className="space-y-2">
                {viewGuest.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate">{viewGuest.email}</span>
                  </div>
                )}
                {viewGuest.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>{viewGuest.phone}</span>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#F4F6FB] px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Table</p>
                  {viewGuest.table ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#1E5FF5]">
                      <Armchair className="h-3.5 w-3.5 shrink-0" />
                      {viewGuest.table.name}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Non assigné</span>
                  )}
                </div>

                <div className="rounded-xl bg-[#F4F6FB] px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">RSVP</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2 py-0.5 ${RSVP_STYLES[viewGuest.rsvpStatus]}`}>
                    {RSVP_ICONS[viewGuest.rsvpStatus]}
                    {RSVP_LABELS[viewGuest.rsvpStatus]}
                  </span>
                </div>
              </div>

              {viewGuest.respondedAt && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Réponse reçue le {formatDate(viewGuest.respondedAt)}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                Ajouté le {formatDate(viewGuest.createdAt)}
              </div>
            </div>
          )}

          <DialogFooter className="bg-[#F8FAFC] border-t border-[#E8ECF4] px-6 py-4 flex justify-between gap-3 rounded-b-[24px] -mx-6 -mb-6 mt-6">
            <Button
              type="button"
              onClick={() => {
                if (viewGuest) openEdit(viewGuest);
                setViewGuest(null);
              }}
              className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Button>
            <Button
              type="button"
              onClick={() => setViewGuest(null)}
              className="h-10 px-5 rounded-xl bg-[#1E5FF5] text-white text-sm font-medium hover:bg-[#154ED0] transition-colors shadow-xs cursor-pointer"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          Edit Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!editGuest} onOpenChange={(o) => !o && setEditGuest(null)}>
        <DialogContent className="max-w-md w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-5">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Modifier l&apos;invité
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[14px] font-medium text-slate-700 mb-1.5 block">
                  Prénom <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Ex : Jean"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  required
                  autoFocus
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[14px] font-medium text-slate-700 mb-1.5 block">
                  Nom <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Ex : Dupont"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[14px] font-medium text-slate-700 mb-1.5 block">
                Adresse e-mail
              </Label>
              <Input
                type="email"
                placeholder="Ex : jean.dupont@gmail.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[14px] font-medium text-slate-700 mb-1.5 block">
                Téléphone
              </Label>
              <Input
                placeholder="Ex : 0612345678"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[14px] font-medium text-slate-700 mb-1.5 block">
                Type d&apos;invitation <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  value={editInvitationType}
                  onChange={(e) => setEditInvitationType(e.target.value as "SINGLE" | "COUPLE")}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs cursor-pointer"
                >
                  <option value="SINGLE">Seul(e)</option>
                  <option value="COUPLE">Couple</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <X className="h-4 w-4 rotate-45" />
                </div>
              </div>
            </div>

            {editInvitationType === "COUPLE" && (
              <div className="border-t border-slate-100 pt-4 mt-2 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Accompagnateur / Conjoint
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[14px] font-medium text-slate-700 mb-1.5 block">
                      Prénom <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Prénom"
                      value={editPlusOneFirstName}
                      onChange={(e) => setEditPlusOneFirstName(e.target.value)}
                      required
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[14px] font-medium text-slate-700 mb-1.5 block">
                      Nom <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Nom"
                      value={editPlusOneLastName}
                      onChange={(e) => setEditPlusOneLastName(e.target.value)}
                      required
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="bg-[#F8FAFC] border-t border-[#E8ECF4] px-6 py-4 flex justify-end gap-3 rounded-b-[24px] -mx-6 -mb-6 mt-6">
              <Button
                type="button"
                onClick={() => setEditGuest(null)}
                disabled={editLoading}
                className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={editLoading || !editFirstName.trim() || !editLastName.trim()}
                className="h-10 px-5 rounded-xl bg-[#1E5FF5] text-white text-sm font-medium hover:bg-[#154ED0] transition-colors shadow-xs cursor-pointer"
              >
                {editLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sauvegarde…
                  </span>
                ) : (
                  "Sauvegarder"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          Delete Confirm Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!deleteGuest} onOpenChange={(o) => !o && setDeleteGuest(null)}>
        <DialogContent className="max-w-sm w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-5">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Supprimer l&apos;invité
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
            <p className="text-sm text-red-700">
              Supprimer définitivement{" "}
              <strong>
                {deleteGuest?.firstName} {deleteGuest?.lastName}
              </strong>{" "}
              ? Cette action est irréversible.
            </p>
          </div>

          <DialogFooter className="bg-[#F8FAFC] border-t border-[#E8ECF4] px-6 py-4 flex justify-end gap-3 rounded-b-[24px] -mx-6 -mb-6 mt-6">
            <Button
              type="button"
              onClick={() => setDeleteGuest(null)}
              disabled={deleteLoading}
              className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleteLoading}
              className="h-10 px-5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors shadow-xs cursor-pointer"
            >
              {deleteLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Suppression…
                </span>
              ) : (
                "Supprimer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
