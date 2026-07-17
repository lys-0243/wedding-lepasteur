"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
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
  Upload,
  Download,
  Plus,
  FileSpreadsheet,
  Share2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
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
  token: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  invitationType: "SINGLE" | "COUPLE" | "DUO";
  plusOneFirstName: string | null;
  plusOneLastName: string | null;
  rsvpStatus: "PENDING" | "CONFIRMED" | "DECLINED" | "PRESENT";
  plusOneRsvpStatus: "PENDING" | "CONFIRMED" | "DECLINED" | "PRESENT" | null;
  respondedAt: string | null;
  checkedInAt: string | null;
  createdAt: string;
  table: GuestTable;
};

type Props = {
  eventId: string;
  initialGuests: Guest[];
  event?: {
    title: string;
    eventDate: string | null;
    startTime?: string | null;
  };
};

const RSVP_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  DECLINED: "Décliné",
  PRESENT: "Présent",
};

const RSVP_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  DECLINED: "bg-red-50 text-red-600 border border-red-200",
  PRESENT: "bg-sky-50 text-sky-700 border border-sky-200",
};

const RSVP_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3 w-3" />,
  CONFIRMED: <UserCheck className="h-3 w-3" />,
  DECLINED: <UserX className="h-3 w-3" />,
  PRESENT: <CheckCircle2 className="h-3 w-3" />,
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function guestHeads(g: { invitationType: string }) {
  return g.invitationType === "COUPLE" || g.invitationType === "DUO" ? 2 : 1;
}

export function GuestsClient({ eventId, initialGuests, event }: Props) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [, startTransition] = useTransition();
  const [copiedTokens, setCopiedTokens] = useState<Set<string>>(new Set());

  // ── View dialog ────────────────────────────────────────────────────────────
  const [viewGuest, setViewGuest] = useState<Guest | null>(null);

  // ── Edit dialog ────────────────────────────────────────────────────────────
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editInvitationType, setEditInvitationType] = useState<
    "SINGLE" | "COUPLE" | "DUO"
  >("SINGLE");
  const [editPlusOneFirstName, setEditPlusOneFirstName] = useState("");
  const [editPlusOneLastName, setEditPlusOneLastName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // ── Delete dialog ──────────────────────────────────────────────────────────
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Create dialog ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createInvitationType, setCreateInvitationType] = useState<
    "SINGLE" | "COUPLE" | "DUO"
  >("SINGLE");
  const [createPlusOneFirstName, setCreatePlusOneFirstName] = useState("");
  const [createPlusOneLastName, setCreatePlusOneLastName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // ── Import dialog ──────────────────────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [mappedColumns, setMappedColumns] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    invitationType: "",
    plusOneFirstName: "",
    plusOneLastName: "",
    table: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  function getInviteLink(token: string) {
    if (typeof window === "undefined") return `/invite/${token}/confirmation`;
    return `${window.location.origin}/invite/${token}/confirmation`;
  }

  async function handleShareInvite(guest: Guest) {
    if (!guest.table) {
      toast.error(
        "Assignez d'abord cet invité à une table pour partager son invitation.",
      );
      return;
    }

    const inviteUrl = getInviteLink(guest.token);

    // Format event date in French
    const eventDateStr = event?.eventDate
      ? new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(new Date(event.eventDate)) +
        (event?.startTime ? ` · ${event.startTime}` : "")
      : "";

    const eventTitle = event?.title || "l'événement";

    // Build richer WhatsApp message with event context
    const text = eventDateStr
      ? `Bonjour ${guest.firstName}, tu es invité au ${eventTitle} (${eventDateStr}). Clique ici pour confirmer ta présence: ${inviteUrl}`
      : `Bonjour ${guest.firstName}, tu es invité au ${eventTitle}. Clique ici pour confirmer ta présence: ${inviteUrl}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    if (typeof window !== "undefined") {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }

    toast.info("Partagez le lien avec le contact de votre choix sur WhatsApp.");
  }

  async function handleCopyLink(guest: Guest) {
    if (!guest.table) {
      toast.error("Assignez d'abord cet invité à une table.");
      return;
    }

    const inviteUrl = getInviteLink(guest.token);
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedTokens((prev) => new Set(prev).add(guest.id));
      setTimeout(() => {
        setCopiedTokens((prev) => {
          const next = new Set(prev);
          next.delete(guest.id);
          return next;
        });
      }, 2000);
      toast.success("Lien copié dans le presse-papiers.");
    } catch {
      toast.error("Impossible de copier le lien.");
    }
  }

  // ── Counts ─────────────────────────────────────────────────────────────────
  const confirmed = guests.filter((g) => g.rsvpStatus === "CONFIRMED").length;
  const declined = guests.filter((g) => g.rsvpStatus === "DECLINED").length;
  const pending = guests.filter((g) => g.rsvpStatus === "PENDING").length;
  const present = guests.filter((g) => g.rsvpStatus === "PRESENT").length;
  const noShow = confirmed; // CONFIRMED = not yet scanned to PRESENT

  const totalAttendees = guests.reduce((sum, g) => sum + guestHeads(g), 0);
  const presentHeads = guests
    .filter((g) => g.rsvpStatus === "PRESENT")
    .reduce((sum, g) => sum + guestHeads(g), 0);

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
      statusFilter === "ALL"
        ? true
        : statusFilter === "NOSHOW"
          ? g.rsvpStatus === "CONFIRMED"
          : g.rsvpStatus === statusFilter;

    return matchSearch && matchStatus;
  });

  const statChips = [
    {
      key: "ALL",
      label: "Tous",
      count: guests.length,
      color: "text-slate-700",
    },
    {
      key: "CONFIRMED",
      label: "Confirmés",
      count: confirmed,
      color: "text-emerald-600",
    },
    {
      key: "PENDING",
      label: "En attente",
      count: pending,
      color: "text-amber-600",
    },
    {
      key: "DECLINED",
      label: "Déclinés",
      count: declined,
      color: "text-red-600",
    },
    {
      key: "PRESENT",
      label: "Présents",
      count: present,
      color: "text-sky-600",
    },
    {
      key: "NOSHOW",
      label: "No-show",
      count: noShow,
      color: "text-orange-600",
    },
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
          plusOneFirstName:
            editInvitationType === "COUPLE" || editInvitationType === "DUO" ? editPlusOneFirstName : "",
          plusOneLastName:
            editInvitationType === "COUPLE" || editInvitationType === "DUO" ? editPlusOneLastName : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la modification.");
        return;
      }
      setGuests((prev) =>
        prev
          .map((g) =>
            g.id === data.id
              ? {
                  ...g,
                  ...data,
                  token: data.token ?? g.token,
                  checkedInAt: data.checkedInAt ?? g.checkedInAt ?? null,
                }
              : g,
          )
          .sort((a, b) => a.lastName.localeCompare(b.lastName)),
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
      const res = await fetch(
        `/api/events/${eventId}/guests/${deleteGuest.id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        toast.error("Erreur lors de la suppression.");
        return;
      }
      setGuests((prev) => prev.filter((g) => g.id !== deleteGuest.id));
      toast.success(
        `${deleteGuest.firstName} ${deleteGuest.lastName} a été supprimé.`,
      );
      setDeleteGuest(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: createFirstName,
          lastName: createLastName,
          email: createEmail,
          phone: createPhone,
          invitationType: createInvitationType,
          plusOneFirstName:
            createInvitationType === "COUPLE" || createInvitationType === "DUO" ? createPlusOneFirstName : "",
          plusOneLastName:
            createInvitationType === "COUPLE" || createInvitationType === "DUO" ? createPlusOneLastName : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la création.");
        return;
      }
      setGuests((prev) =>
        [
          ...prev,
          {
            ...data,
            table: null,
            checkedInAt: data.checkedInAt ?? null,
            respondedAt: data.respondedAt
              ? typeof data.respondedAt === "string"
                ? data.respondedAt
                : new Date(data.respondedAt).toISOString()
              : null,
            createdAt:
              typeof data.createdAt === "string"
                ? data.createdAt
                : new Date(data.createdAt).toISOString(),
          },
        ].sort((a, b) => a.lastName.localeCompare(b.lastName)),
      );
      setCreateOpen(false);
      resetCreateForm();
      toast.success(`${data.firstName} ${data.lastName} a été ajouté.`);
    } finally {
      setCreateLoading(false);
    }
  }

  function resetCreateForm() {
    setCreateFirstName("");
    setCreateLastName("");
    setCreateEmail("");
    setCreatePhone("");
    setCreateInvitationType("SINGLE");
    setCreatePlusOneFirstName("");
    setCreatePlusOneLastName("");
  }

  function handleExportExcel() {
    try {
      const exportData = guests.map((g) => {
        const rsvpLabel = RSVP_LABELS[g.rsvpStatus] ?? "En attente";

        return {
          Prénom: g.firstName,
          Nom: g.lastName,
          Email: g.email || "",
          Téléphone: g.phone || "",
          "Type d'invitation":
            g.invitationType === "COUPLE" ? "Couple" : g.invitationType === "DUO" ? "Duo" : "Seul",
          "Accompagnateur Prénom": g.plusOneFirstName || "",
          "Accompagnateur Nom": g.plusOneLastName || "",
          "Statut RSVP": rsvpLabel,
          Arrivée: g.checkedInAt ? formatDateTime(g.checkedInAt) : "",
          Table: g.table?.name || "Non assigné",
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invités");
      XLSX.writeFile(workbook, `invites-evenement-${eventId}.xlsx`);
      toast.success("La liste des invités a été exportée.");
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'exporter la liste des invités.");
    }
  }

  function handleExportNoShow() {
    try {
      const noShows = guests.filter((g) => g.rsvpStatus === "CONFIRMED");
      if (noShows.length === 0) {
        toast.error("Aucun no-show à exporter.");
        return;
      }
      const exportData = noShows.map((g) => ({
        Prénom: g.firstName,
        Nom: g.lastName,
        Email: g.email || "",
        Téléphone: g.phone || "",
        "Type d'invitation":
          g.invitationType === "COUPLE" ? "Couple" : g.invitationType === "DUO" ? "Duo" : "Seul",
        "Accompagnateur Prénom": g.plusOneFirstName || "",
        "Accompagnateur Nom": g.plusOneLastName || "",
        "Statut RSVP": "Confirmé (absent)",
        Table: g.table?.name || "Non assigné",
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "No-show");
      XLSX.writeFile(workbook, `no-show-evenement-${eventId}.xlsx`);
      toast.success("La liste des no-shows a été exportée.");
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'exporter les no-shows.");
    }
  }

  async function refreshGuests() {
    const res = await fetch(`/api/events/${eventId}/guests`);
    if (res.ok) {
      const data = await res.json();
      startTransition(() => setGuests(data));
    }
  }

  function getSheetHeaders(sheet: XLSX.WorkSheet): string[] {
    const headers: string[] = [];
    const range = XLSX.utils.decode_range(sheet["!ref"] || "");
    const R = range.s.r;
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = { c: C, r: R };
      const cell_ref = XLSX.utils.encode_cell(cell_address);
      const cell = sheet[cell_ref];
      if (cell && cell.t) {
        headers.push(String(cell.v).trim());
      } else {
        headers.push(`Colonne ${C + 1}`);
      }
    }
    return headers;
  }

  function processFile(file: File) {
    if (!file) return;
    setImportLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
          defval: "",
        });
        if (rawRows.length === 0) {
          toast.error("Le fichier Excel est vide.");
          return;
        }

        const headers = getSheetHeaders(sheet);
        setFileHeaders(headers);
        setRawData(rawRows);
        setUploadedFileName(file.name);

        // Auto mapping
        const fnCol =
          headers.find((h) => /prenom|prénom|first/i.test(h)) ||
          headers[0] ||
          "";
        const lnCol =
          headers.find((h) => /nom|last/i.test(h)) || headers[1] || "";
        const emCol = headers.find((h) => /mail/i.test(h)) || "";
        const phCol = headers.find((h) => /tel|tél|phone/i.test(h)) || "";
        const typeCol = headers.find((h) => /type|invit/i.test(h)) || "";
        const p1FnCol =
          headers.find((h) =>
            /(conjoint|accomp|plus).*prenom|prenom.*(conjoint|accomp|plus)|plus.*first/i.test(
              h,
            ),
          ) || "";
        const p1LnCol =
          headers.find((h) =>
            /(conjoint|accomp|plus).*nom|nom.*(conjoint|accomp|plus)|plus.*last/i.test(
              h,
            ),
          ) || "";
        const tableCol = headers.find((h) => /table|placement/i.test(h)) || "";

        setMappedColumns({
          firstName: fnCol,
          lastName: lnCol,
          email: emCol,
          phone: phCol,
          invitationType: typeCol,
          plusOneFirstName: p1FnCol,
          plusOneLastName: p1LnCol,
          table: tableCol,
        });
      } catch (err) {
        console.error(err);
        toast.error("Impossible de lire le fichier Excel.");
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  function clearUploadedFile() {
    setUploadedFileName(null);
    setFileHeaders([]);
    setRawData([]);
    setMappedColumns({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      invitationType: "",
      plusOneFirstName: "",
      plusOneLastName: "",
      table: "",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImportSubmit() {
    if (!mappedColumns.firstName || !mappedColumns.lastName) {
      toast.error("Veuillez associer au moins les champs Prénom et Nom.");
      return;
    }

    setImportLoading(true);
    try {
      const guestsToImport = rawData
        .map((row) => {
          const fName = String(row[mappedColumns.firstName] || "").trim();
          const lName = String(row[mappedColumns.lastName] || "").trim();
          const emailVal = mappedColumns.email
            ? String(row[mappedColumns.email] || "").trim()
            : "";
          const phoneVal = mappedColumns.phone
            ? String(row[mappedColumns.phone] || "").trim()
            : "";

          let invType: "SINGLE" | "COUPLE" | "DUO" = "SINGLE";
          if (mappedColumns.invitationType) {
            const rawType = String(
              row[mappedColumns.invitationType] || "",
            ).toLowerCase();
            if (rawType.includes("couple")) {
              invType = "COUPLE";
            } else if (rawType.includes("duo") || rawType.includes("deux") || rawType.includes("2")) {
              invType = "DUO";
            }
          } else if (
            mappedColumns.plusOneFirstName &&
            String(row[mappedColumns.plusOneFirstName] || "").trim()
          ) {
            invType = "COUPLE";
          }

          const p1Fn = mappedColumns.plusOneFirstName
            ? String(row[mappedColumns.plusOneFirstName] || "").trim()
            : "";
          const p1Ln = mappedColumns.plusOneLastName
            ? String(row[mappedColumns.plusOneLastName] || "").trim()
            : "";
          const tableName = mappedColumns.table
            ? String(row[mappedColumns.table] || "").trim()
            : "";

          return {
            firstName: fName,
            lastName: lName,
            email: emailVal,
            phone: phoneVal,
            invitationType: invType,
            plusOneFirstName: p1Fn,
            plusOneLastName: p1Ln,
            tableName,
          };
        })
        .filter((g) => g.firstName.length > 0 && g.lastName.length > 0);

      if (guestsToImport.length === 0) {
        toast.error("Aucun invité valide à importer.");
        return;
      }

      const res = await fetch(`/api/events/${eventId}/guests/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests: guestsToImport }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'importation.");
        return;
      }

      toast.success(
        `Importation réussie : ${data.created} invité(s) ajouté(s).`,
      );
      setImportOpen(false);
      clearUploadedFile();
      await refreshGuests();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'importation.");
    } finally {
      setImportLoading(false);
    }
  }

  const previewRows = rawData.slice(0, 5).map((row) => {
    const fName = mappedColumns.firstName
      ? String(row[mappedColumns.firstName] || "").trim()
      : "";
    const lName = mappedColumns.lastName
      ? String(row[mappedColumns.lastName] || "").trim()
      : "";
    const emailVal = mappedColumns.email
      ? String(row[mappedColumns.email] || "").trim()
      : "";
    const plusOne = mappedColumns.plusOneFirstName
      ? `${String(row[mappedColumns.plusOneFirstName] || "")} ${mappedColumns.plusOneLastName ? String(row[mappedColumns.plusOneLastName] || "") : ""}`.trim()
      : "";
    const tableName = mappedColumns.table
      ? String(row[mappedColumns.table] || "").trim()
      : "";
    return {
      name: `${fName} ${lName}`.trim(),
      email: emailVal,
      plusOne,
      tableName,
    };
  });

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 lg:text-2xl">
            Invités
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {guests.length} fiche{guests.length !== 1 ? "s" : ""} ·{" "}
            {totalAttendees} personne
            {totalAttendees !== 1 ? "s" : ""} au total ·{" "}
            {presentHeads} présente{presentHeads !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Import Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="gap-2 border-[#E8ECF4] text-slate-600 hover:bg-slate-50 cursor-pointer h-10 px-4 rounded-xl"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importer Excel</span>
            <span className="sm:hidden">Import</span>
          </Button>

          {/* Export Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2 border-[#E8ECF4] text-slate-600 hover:bg-slate-50 cursor-pointer h-10 px-4 rounded-xl"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter Excel</span>
            <span className="sm:hidden">Export</span>
          </Button>

          {/* Export no-show */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportNoShow}
            className="gap-2 border-[#E8ECF4] text-slate-600 hover:bg-slate-50 cursor-pointer h-10 px-4 rounded-xl"
          >
            <UserX className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter no-show</span>
            <span className="sm:hidden">No-show</span>
          </Button>

          {/* Ajouter un invité */}
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-[#1E5FF5] text-white hover:bg-[#154ED0] cursor-pointer h-10 px-4 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
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
      <div className="mt-4 overflow-x-auto rounded-2xl border border-[#E8ECF4] bg-white shadow-sm">
        {/* Table head */}
        <div className="min-w-[680px] grid grid-cols-[2fr_1fr_1fr_1fr_100px] items-center border-b border-[#E8ECF4] bg-slate-50/60 px-5 py-3 text-[0.7rem] font-bold uppercase tracking-widest text-slate-400">
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
                className={`min-w-[680px] grid grid-cols-[2fr_1fr_1fr_1fr_100px] items-center gap-2 px-5 py-3.5 transition-colors hover:bg-slate-50/60 ${
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
                  ) : guest.invitationType === "DUO" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5">
                      <Users className="h-2.5 w-2.5" />
                      Duo
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
                    <Link
                      href={`/events/${eventId}/tables/${guest.table.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#1E5FF5] bg-blue-50 border border-blue-200 rounded-lg px-2 py-0.5 truncate max-w-[120px] hover:bg-blue-100 transition-colors"
                    >
                      <Armchair className="h-2.5 w-2.5 shrink-0" />
                      {guest.table.name}
                    </Link>
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
                  {(guest.invitationType === "COUPLE" || guest.invitationType === "DUO") &&
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
                  {guest.table ? (
                    <>
                      <button
                        onClick={() => void handleCopyLink(guest)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        title="Copier le lien"
                      >
                        {copiedTokens.has(guest.id) ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => void handleShareInvite(guest)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                        title="Partager sur WhatsApp"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          window.open(
                            `/api/events/${eventId}/guests/${guest.id}/download-invitation`,
                            "_blank",
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-purple-50 hover:text-purple-600"
                        title="Télécharger l'invitation avec QR code"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 cursor-not-allowed"
                      title="Assignez à une table pour partager"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </div>
                  )}
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
                {(viewGuest.invitationType === "COUPLE" || viewGuest.invitationType === "DUO") && (
                  <p className="text-sm text-pink-600 flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 shrink-0" />
                    {viewGuest.invitationType === "DUO" ? "Duo avec" : "Couple avec"} {viewGuest.plusOneFirstName || ""}{" "}
                    {viewGuest.plusOneLastName || ""}
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
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Table
                  </p>
                  {viewGuest.table ? (
                    <Link
                      href={`/events/${eventId}/tables/${viewGuest.table.id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#1E5FF5] hover:underline"
                    >
                      <Armchair className="h-3.5 w-3.5 shrink-0" />
                      {viewGuest.table.name}
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-400 italic">
                      Non assigné
                    </span>
                  )}
                </div>

                <div className="rounded-xl bg-[#F4F6FB] px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    RSVP
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2 py-0.5 ${RSVP_STYLES[viewGuest.rsvpStatus]}`}
                  >
                    {RSVP_ICONS[viewGuest.rsvpStatus]}
                    {RSVP_LABELS[viewGuest.rsvpStatus]}
                  </span>
                </div>
              </div>

              {viewGuest.checkedInAt && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Arrivé à : {formatDateTime(viewGuest.checkedInAt)}
                </div>
              )}

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
                  onChange={(e) =>
                    setEditInvitationType(e.target.value as "SINGLE" | "COUPLE" | "DUO")
                  }
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs cursor-pointer"
                >
                  <option value="SINGLE">Seul(e)</option>
                  <option value="COUPLE">Couple</option>
                  <option value="DUO">Duo</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <X className="h-4 w-4 rotate-45" />
                </div>
              </div>
            </div>

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
                disabled={
                  editLoading || !editFirstName.trim() || !editLastName.trim()
                }
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
      <Dialog
        open={!!deleteGuest}
        onOpenChange={(o) => !o && setDeleteGuest(null)}
      >
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

      {/* ── Create Guest Dialog ──────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-5">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Ajouter un invité
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="create-firstname"
                  className="text-[14px] font-medium text-slate-700 mb-1.5 block"
                >
                  Prénom <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-firstname"
                  placeholder="Ex : Jean"
                  value={createFirstName}
                  onChange={(e) => setCreateFirstName(e.target.value)}
                  required
                  autoFocus
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="create-lastname"
                  className="text-[14px] font-medium text-slate-700 mb-1.5 block"
                >
                  Nom <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-lastname"
                  placeholder="Ex : Dupont"
                  value={createLastName}
                  onChange={(e) => setCreateLastName(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="create-email"
                className="text-[14px] font-medium text-slate-700 mb-1.5 block"
              >
                Adresse e-mail
              </Label>
              <Input
                id="create-email"
                type="email"
                placeholder="Ex : jean.dupont@gmail.com"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="create-phone"
                className="text-[14px] font-medium text-slate-700 mb-1.5 block"
              >
                Téléphone
              </Label>
              <Input
                id="create-phone"
                placeholder="Ex : 0612345678"
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="create-invitation-type"
                className="text-[14px] font-medium text-slate-700 mb-1.5 block"
              >
                Type d&apos;invitation <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  id="create-invitation-type"
                  value={createInvitationType}
                  onChange={(e) =>
                    setCreateInvitationType(
                      e.target.value as "SINGLE" | "COUPLE" | "DUO",
                    )
                  }
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs cursor-pointer"
                >
                  <option value="SINGLE">Seul</option>
                  <option value="COUPLE">Couple</option>
                  <option value="DUO">Duo</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                  <X className="h-4 w-4 rotate-45" />
                </div>
              </div>
            </div>

            <DialogFooter className="bg-[#F8FAFC] border-t border-[#E8ECF4] px-6 py-4 flex justify-end gap-3 rounded-b-[24px] -mx-6 -mb-6 mt-6">
              <Button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={createLoading}
                className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  createLoading ||
                  !createFirstName.trim() ||
                  !createLastName.trim()
                }
                className="h-10 px-5 rounded-xl bg-[#1E5FF5] text-white text-sm font-medium hover:bg-[#154ED0] transition-colors shadow-xs cursor-pointer"
              >
                {createLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Création…
                  </span>
                ) : (
                  "Créer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Import Guests Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={importOpen}
        onOpenChange={(o) => {
          if (!o) {
            setImportOpen(false);
            clearUploadedFile();
          }
        }}
      >
        <DialogContent className="w-[min(66.67vw,72rem)] max-w-[calc(100vw-2rem)] rounded-3xl bg-white p-6 shadow-2xl border-none gap-0 outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-4">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Importer des invités
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Chargez un fichier Excel avec les colonnes Prénom, Nom, Email,
              Téléphone, Accompagnateur.
            </p>
          </DialogHeader>

          {/* Main content based on file status */}
          <div className="py-2">
            {!uploadedFileName ? (
              // Step 1: Upload Dropzone
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-10 px-4 transition-all cursor-pointer ${
                  dragActive
                    ? "border-[#1E5FF5] bg-blue-50/50"
                    : "border-slate-200 hover:border-[#1E5FF5] hover:bg-slate-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#1E5FF5] mb-4">
                  <Upload className="h-6 w-6" />
                </div>

                <p className="text-sm font-medium text-slate-700 text-center">
                  Glissez un fichier ici ou
                </p>
                <button
                  type="button"
                  className="text-sm font-semibold text-[#1E5FF5] hover:underline mt-1 cursor-pointer"
                >
                  parcourir vos fichiers
                </button>

                <p className="text-[11px] text-slate-400 mt-3">
                  Formats : .xlsx, .xls, .csv
                </p>
              </div>
            ) : (
              // Step 2: Mapping and Preview
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {/* File badge */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {uploadedFileName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearUploadedFile}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Column Correspondence */}
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Correspondance des colonnes
                  </h3>

                  <div className="space-y-2">
                    {/* Prénom mapping */}
                    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                      <Label className="text-[14px] font-medium text-slate-700">
                        Prénom <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative w-2/3">
                        <select
                          value={mappedColumns.firstName}
                          onChange={(e) =>
                            setMappedColumns({
                              ...mappedColumns,
                              firstName: e.target.value,
                            })
                          }
                          className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-slate-800 text-[13px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 cursor-pointer"
                        >
                          <option value="">— Choisir —</option>
                          {fileHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                          <X className="h-3.5 w-3.5 rotate-45" />
                        </div>
                      </div>
                    </div>

                    {/* Nom mapping */}
                    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                      <Label className="text-[14px] font-medium text-slate-700">
                        Nom <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative w-2/3">
                        <select
                          value={mappedColumns.lastName}
                          onChange={(e) =>
                            setMappedColumns({
                              ...mappedColumns,
                              lastName: e.target.value,
                            })
                          }
                          className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-slate-800 text-[13px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 cursor-pointer"
                        >
                          <option value="">— Choisir —</option>
                          {fileHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                          <X className="h-3.5 w-3.5 rotate-45" />
                        </div>
                      </div>
                    </div>

                    {/* Email mapping */}
                    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                      <Label className="text-[14px] font-medium text-slate-700">
                        Email
                      </Label>
                      <div className="relative w-2/3">
                        <select
                          value={mappedColumns.email}
                          onChange={(e) =>
                            setMappedColumns({
                              ...mappedColumns,
                              email: e.target.value,
                            })
                          }
                          className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-slate-800 text-[13px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 cursor-pointer"
                        >
                          <option value="">— Choisir (Optionnel) —</option>
                          {fileHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                          <X className="h-3.5 w-3.5 rotate-45" />
                        </div>
                      </div>
                    </div>

                    {/* Téléphone mapping */}
                    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                      <Label className="text-[14px] font-medium text-slate-700">
                        Téléphone
                      </Label>
                      <div className="relative w-2/3">
                        <select
                          value={mappedColumns.phone}
                          onChange={(e) =>
                            setMappedColumns({
                              ...mappedColumns,
                              phone: e.target.value,
                            })
                          }
                          className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-slate-800 text-[13px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 cursor-pointer"
                        >
                          <option value="">— Choisir (Optionnel) —</option>
                          {fileHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                          <X className="h-3.5 w-3.5 rotate-45" />
                        </div>
                      </div>
                    </div>

                    {/* Invitation Type mapping */}
                    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                      <Label className="text-[14px] font-medium text-slate-700">
                        Type d&apos;invitation
                      </Label>
                      <div className="relative w-2/3">
                        <select
                          value={mappedColumns.invitationType}
                          onChange={(e) =>
                            setMappedColumns({
                              ...mappedColumns,
                              invitationType: e.target.value,
                            })
                          }
                          className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-slate-800 text-[13px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 cursor-pointer"
                        >
                          <option value="">— Choisir (Optionnel) —</option>
                          {fileHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                          <X className="h-3.5 w-3.5 rotate-45" />
                        </div>
                      </div>
                    </div>

                    {/* Accompagnateur Prénom mapping */}
                    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                      <Label className="text-[14px] font-medium text-slate-700">
                        Accompagnateur Prénom
                      </Label>
                      <div className="relative w-2/3">
                        <select
                          value={mappedColumns.plusOneFirstName}
                          onChange={(e) =>
                            setMappedColumns({
                              ...mappedColumns,
                              plusOneFirstName: e.target.value,
                            })
                          }
                          className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-slate-800 text-[13px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 cursor-pointer"
                        >
                          <option value="">— Choisir (Optionnel) —</option>
                          {fileHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                          <X className="h-3.5 w-3.5 rotate-45" />
                        </div>
                      </div>
                    </div>

                    {/* Accompagnateur Nom mapping */}
                    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                      <Label className="text-[14px] font-medium text-slate-700">
                        Accompagnateur Nom
                      </Label>
                      <div className="relative w-2/3">
                        <select
                          value={mappedColumns.plusOneLastName}
                          onChange={(e) =>
                            setMappedColumns({
                              ...mappedColumns,
                              plusOneLastName: e.target.value,
                            })
                          }
                          className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-slate-800 text-[13px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 cursor-pointer"
                        >
                          <option value="">— Choisir (Optionnel) —</option>
                          {fileHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                          <X className="h-3.5 w-3.5 rotate-45" />
                        </div>
                      </div>
                    </div>

                    {/* Table mapping */}
                    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                      <Label className="text-[14px] font-medium text-slate-700">
                        Table
                      </Label>
                      <div className="relative w-2/3">
                        <select
                          value={mappedColumns.table}
                          onChange={(e) =>
                            setMappedColumns({
                              ...mappedColumns,
                              table: e.target.value,
                            })
                          }
                          className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-slate-800 text-[13px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 cursor-pointer"
                        >
                          <option value="">— Choisir (Optionnel) —</option>
                          {fileHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                          <X className="h-3.5 w-3.5 rotate-45" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {mappedColumns.firstName && mappedColumns.lastName && (
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-2">
                      Aperçu (5 premières lignes)
                    </h3>

                    <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/20">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2 font-semibold text-slate-500">
                              Nom complet
                            </th>
                            <th className="px-3 py-2 font-semibold text-slate-500">
                              Email
                            </th>
                            <th className="px-3 py-2 font-semibold text-slate-500">
                              Accompagnateur
                            </th>
                            <th className="px-3 py-2 font-semibold text-slate-500">
                              Table
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-slate-100 last:border-none"
                            >
                              <td className="px-3 py-2 text-slate-700 font-medium truncate max-w-[150px]">
                                {row.name || (
                                  <span className="text-slate-400 italic">
                                    Vide
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-650 truncate max-w-[150px]">
                                {row.email || "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-650 truncate max-w-[150px]">
                                {row.plusOne || "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-650 truncate max-w-[150px]">
                                {row.tableName || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="bg-[#F8FAFC] border-t border-[#E8ECF4] px-6 py-4 flex justify-end gap-3 rounded-b-[24px] -mx-6 -mb-6 mt-6">
            <Button
              type="button"
              onClick={() => {
                setImportOpen(false);
                clearUploadedFile();
              }}
              disabled={importLoading}
              className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              Annuler
            </Button>
            {uploadedFileName && (
              <Button
                type="button"
                onClick={handleImportSubmit}
                disabled={
                  importLoading ||
                  !mappedColumns.firstName ||
                  !mappedColumns.lastName
                }
                className="h-10 px-5 rounded-xl bg-[#1E5FF5] text-white text-sm font-medium hover:bg-[#154ED0] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {importLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Importation…
                  </span>
                ) : (
                  "Importer"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
