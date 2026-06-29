"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Upload,
  Pencil,
  Trash2,
  Users,
  FileSpreadsheet,
  X,
  AlertTriangle,
  Link2Off,
  Download,
  Eye,
  Mail,
  Phone,
  Calendar,
  Heart,
  Armchair,
  Clock,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { GuestName } from "@/components/guests/guest-name";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GuestRow = {
  id: string;
  token: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  invitationType: "SINGLE" | "COUPLE";
  plusOneFirstName: string | null;
  plusOneLastName: string | null;
  rsvpStatus: "PENDING" | "CONFIRMED" | "DECLINED";
  plusOneRsvpStatus: "PENDING" | "CONFIRMED" | "DECLINED" | null;
  respondedAt: Date | string | null;
  createdAt: Date | string;
};

type TableDetail = {
  id: string;
  name: string;
  capacity: number;
  guests: GuestRow[];
};

type Props = {
  eventId: string;
  table: TableDetail;
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

function formatDate(iso: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function TableDetailClient({ eventId, table: initialTable }: Props) {
  const [table, setTable] = useState<TableDetail>(initialTable);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // ── View guest dialog ────────────────────────────────────────────────────
  const [viewGuest, setViewGuest] = useState<GuestRow | null>(null);

  // ── Create guest dialog ───────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");
  const [unassignedGuests, setUnassignedGuests] = useState<GuestRow[]>([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [invitationType, setInvitationType] = useState<"SINGLE" | "COUPLE">(
    "SINGLE",
  );
  const [plusOneFirstName, setPlusOneFirstName] = useState("");
  const [plusOneLastName, setPlusOneLastName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (createOpen) {
      setLoadingUnassigned(true);
      fetch(`/api/events/${eventId}/guests?unassigned=true`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((data) => {
          setUnassignedGuests(data);
        })
        .catch(() => {
          toast.error("Impossible de charger la liste des invités existants.");
        })
        .finally(() => {
          setLoadingUnassigned(false);
        });
    } else {
      // Reset state when closing
      setActiveTab("existing");
      setSelectedGuestId("");
    }
  }, [createOpen, eventId]);

  // ── Edit guest dialog ─────────────────────────────────────────────────────
  const [editGuest, setEditGuest] = useState<GuestRow | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editInvitationType, setEditInvitationType] = useState<
    "SINGLE" | "COUPLE"
  >("SINGLE");
  const [editPlusOneFirstName, setEditPlusOneFirstName] = useState("");
  const [editPlusOneLastName, setEditPlusOneLastName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // ── Delete guest / unassign dialog ────────────────────────────────────────
  const [deleteGuest, setDeleteGuest] = useState<GuestRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [unassignGuest, setUnassignGuest] = useState<GuestRow | null>(null);
  const [unassignLoading, setUnassignLoading] = useState(false);

  // ── Import dialog ─────────────────────────────────────────────────────────
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
  });

  const [downloadingAll, setDownloadingAll] = useState(false);

  async function handleDownloadAllInvitations() {
    const guests = table.guests;
    if (guests.length === 0) {
      toast.error("Aucun invité dans cette table.");
      return;
    }

    setDownloadingAll(true);
    try {
      for (const guest of guests) {
        window.open(
          `/api/events/${eventId}/guests/${guest.id}/download-invitation`,
          "_blank",
        );
        await new Promise((r) => setTimeout(r, 400));
      }
      toast.success(`${guests.length} invitation(s) générée(s).`);
    } catch {
      toast.error("Erreur lors de la génération des invitations.");
    } finally {
      setDownloadingAll(false);
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExportGuests() {
    try {
      const exportData = table.guests.map((g) => {
        let rsvpLabel = "En attente";
        if (g.rsvpStatus === "CONFIRMED") rsvpLabel = "Confirmé";
        if (g.rsvpStatus === "DECLINED") rsvpLabel = "Décliné";

        return {
          Prénom: g.firstName,
          Nom: g.lastName,
          Email: g.email || "",
          Téléphone: g.phone || "",
          "Type d'invitation":
            g.invitationType === "COUPLE" ? "Couple" : "Seul",
          "Accompagnateur Prénom": g.plusOneFirstName || "",
          "Accompagnateur Nom": g.plusOneLastName || "",
          "Statut RSVP": rsvpLabel,
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invités");
      XLSX.writeFile(workbook, `invites-table-${table.name}.xlsx`);
      toast.success("La liste des invités a été exportée.");
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'exporter la liste des invités.");
    }
  }

  // ── Refresh helper ─────────────────────────────────────────────────────────
  async function refreshTable() {
    const res = await fetch(`/api/events/${eventId}/tables`);
    if (res.ok) {
      const allTables = await res.json();
      const updated = allTables.find((t: any) => t.id === table.id);
      if (updated) {
        // Fetch detailed guests
        const gRes = await fetch(
          `/api/events/${eventId}/tables/${table.id}/guests`,
        );
        if (gRes.ok) {
          const guests = await gRes.json();
          setTable({ ...updated, guests });
        }
      }
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleCreateGuest(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/tables/${table.id}/guests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone,
            invitationType,
            plusOneFirstName:
              invitationType === "COUPLE" ? plusOneFirstName : "",
            plusOneLastName: invitationType === "COUPLE" ? plusOneLastName : "",
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'ajout.");
        return;
      }
      setTable((prev) => ({
        ...prev,
        guests: [...prev.guests, data].sort((a, b) =>
          a.lastName.localeCompare(b.lastName),
        ),
      }));
      setCreateOpen(false);
      resetCreateForm();
      toast.success(`${data.firstName} ${data.lastName} a été ajouté.`);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleAssignExistingGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuestId) {
      toast.error("Veuillez sélectionner un invité.");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/tables/${table.id}/guests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestId: selectedGuestId }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'assignation.");
        return;
      }
      setTable((prev) => ({
        ...prev,
        guests: [...prev.guests, data].sort((a, b) =>
          a.lastName.localeCompare(b.lastName),
        ),
      }));
      setCreateOpen(false);
      setSelectedGuestId("");
      toast.success(
        `${data.firstName} ${data.lastName} a été ajouté à la table.`,
      );
    } finally {
      setCreateLoading(false);
    }
  }

  function resetCreateForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setInvitationType("SINGLE");
    setPlusOneFirstName("");
    setPlusOneLastName("");
  }

  async function handleEditGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!editGuest) return;
    setEditLoading(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/tables/${table.id}/guests/${editGuest.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: editFirstName,
            lastName: editLastName,
            email: editEmail,
            phone: editPhone,
            invitationType: editInvitationType,
            plusOneFirstName:
              editInvitationType === "COUPLE" ? editPlusOneFirstName : "",
            plusOneLastName:
              editInvitationType === "COUPLE" ? editPlusOneLastName : "",
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la modification.");
        return;
      }
      setTable((prev) => ({
        ...prev,
        guests: prev.guests
          .map((g) => (g.id === data.id ? data : g))
          .sort((a, b) => a.lastName.localeCompare(b.lastName)),
      }));
      setEditGuest(null);
      toast.success("Informations de l'invité mises à jour.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteGuest() {
    if (!deleteGuest) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/tables/${table.id}/guests/${deleteGuest.id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        toast.error("Erreur lors de la suppression.");
        return;
      }
      setTable((prev) => ({
        ...prev,
        guests: prev.guests.filter((g) => g.id !== deleteGuest.id),
      }));
      toast.success(
        `${deleteGuest.firstName} ${deleteGuest.lastName} a été supprimé.`,
      );
      setDeleteGuest(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleUnassignGuest() {
    if (!unassignGuest) return;
    setUnassignLoading(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/tables/${table.id}/guests/${unassignGuest.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unassign" }),
        },
      );
      if (!res.ok) {
        toast.error("Erreur lors du retrait.");
        return;
      }
      setTable((prev) => ({
        ...prev,
        guests: prev.guests.filter((g) => g.id !== unassignGuest.id),
      }));
      toast.success(
        `${unassignGuest.firstName} ${unassignGuest.lastName} a été retiré de la table.`,
      );
      setUnassignGuest(null);
    } finally {
      setUnassignLoading(false);
    }
  }

  // ── Import functions ──────────────────────────────────────────────────────
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
            /conjoint.*prenom|accomp.*prenom|plus.*first/i.test(h),
          ) || "";
        const p1LnCol =
          headers.find((h) =>
            /conjoint.*nom|accomp.*nom|plus.*last/i.test(h),
          ) || "";

        setMappedColumns({
          firstName: fnCol,
          lastName: lnCol,
          email: emCol,
          phone: phCol,
          invitationType: typeCol,
          plusOneFirstName: p1FnCol,
          plusOneLastName: p1LnCol,
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

          let invType: "SINGLE" | "COUPLE" = "SINGLE";
          if (mappedColumns.invitationType) {
            const rawType = String(
              row[mappedColumns.invitationType] || "",
            ).toLowerCase();
            if (
              rawType.includes("couple") ||
              rawType.includes("deux") ||
              rawType.includes("2")
            ) {
              invType = "COUPLE";
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

          return {
            firstName: fName,
            lastName: lName,
            email: emailVal,
            phone: phoneVal,
            invitationType: invType,
            plusOneFirstName: p1Fn,
            plusOneLastName: p1Ln,
          };
        })
        .filter((g) => g.firstName.length > 0 && g.lastName.length > 0);

      if (guestsToImport.length === 0) {
        toast.error("Aucun invité valide à importer.");
        return;
      }

      const res = await fetch(
        `/api/events/${eventId}/tables/${table.id}/guests/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guests: guestsToImport }),
        },
      );

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
      await refreshTable();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'importation.");
    } finally {
      setImportLoading(false);
    }
  }

  // ── Filter guests ─────────────────────────────────────────────────────────
  const filteredGuests = table.guests.filter(
    (g) =>
      g.firstName.toLowerCase().includes(search.toLowerCase()) ||
      g.lastName.toLowerCase().includes(search.toLowerCase()),
  );

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
    return { name: `${fName} ${lName}`.trim(), email: emailVal, plusOne };
  });

  return (
    <>
      {/* ── Breadcrumb & header ────────────────────────────────────────────── */}
      <div className="mb-4">
        <Link
          href={`/events/${eventId}/tables`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1E5FF5] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Retour aux tables
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 lg:text-2xl">
            {table.name}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {(() => {
              const occupiedSeats = table.guests.reduce(
                (s, g) => s + (g.invitationType === "COUPLE" ? 2 : 1),
                0,
              );
              const free = table.capacity - occupiedSeats;
              return `${table.guests.length} invité${table.guests.length !== 1 ? "s" : ""} (${occupiedSeats} place${occupiedSeats !== 1 ? "s" : ""} occupée${occupiedSeats !== 1 ? "s" : ""}) · Capacité : ${table.capacity} places (${free} libre${free !== 1 ? "s" : ""})`;
            })()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Import Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="gap-2 border-[#E8ECF4] text-slate-600 hover:bg-slate-50 cursor-pointer h-10 px-4 rounded-xl"
          >
            <Upload className="h-4 w-4" />
            Importer Excel
          </Button>

          {/* Download all invitations */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDownloadAllInvitations()}
            disabled={downloadingAll}
            className="gap-2 border-[#E8ECF4] text-slate-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 cursor-pointer h-10 px-4 rounded-xl disabled:opacity-40"
          >
            {downloadingAll ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Télécharger les invitations
          </Button>

          {/* Export Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportGuests}
            className="gap-2 border-[#E8ECF4] text-slate-600 hover:bg-slate-50 cursor-pointer h-10 px-4 rounded-xl"
          >
            <Download className="h-4 w-4" />
            Exporter Excel
          </Button>

          {/* Add Guest */}
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-[#1E5FF5] text-white hover:bg-[#154ED0] cursor-pointer h-10 px-4 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Ajouter un invité
          </Button>
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="mt-5 flex items-center gap-3">
        <Input
          placeholder="Rechercher un invité…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs border-[#E8ECF4] bg-white text-sm shadow-sm h-10 px-4 rounded-xl focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Effacer
          </button>
        )}
      </div>

      {/* ── Guest List Table ──────────────────────────────────────────────── */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#E8ECF4] bg-white shadow-sm">
        <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1.2fr_140px] items-center border-b border-[#E8ECF4] bg-slate-50/60 px-5 py-3 text-[0.7rem] font-bold uppercase tracking-widest text-slate-400">
          <span>Nom</span>
          <span>Contact</span>
          <span className="text-center">Type</span>
          <span>Accompagnateur / Conjoint</span>
          <span className="text-center">Actions</span>
        </div>

        {filteredGuests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Users className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {search
                ? "Aucun invité ne correspond à votre recherche."
                : "Aucun invité assigné à cette table."}
            </p>
            {!search && (
              <button
                onClick={() => setCreateOpen(true)}
                className="mt-1 text-sm font-semibold text-[#1E5FF5] hover:underline"
              >
                Ajouter le premier invité →
              </button>
            )}
          </div>
        ) : (
          <ul>
            {filteredGuests.map((guest, i) => {
              // RSVP Badges
              const rsvpColors = {
                CONFIRMED: "bg-emerald-50 text-emerald-700",
                PENDING: "bg-amber-50 text-amber-700",
                DECLINED: "bg-red-50 text-red-700",
              };
              const rsvpLabel = {
                CONFIRMED: "Confirmé",
                PENDING: "En attente",
                DECLINED: "Décliné",
              };

              return (
                <li
                  key={guest.id}
                  className={`grid grid-cols-[1.5fr_1.5fr_1fr_1.2fr_140px] items-center gap-2 px-5 py-3.5 transition-colors hover:bg-slate-50/60 ${
                    i !== filteredGuests.length - 1
                      ? "border-b border-[#E8ECF4]"
                      : ""
                  }`}
                >
                  {/* Name */}
                  <GuestName
                    firstName={guest.firstName}
                    lastName={guest.lastName}
                    invitationType={guest.invitationType}
                    plusOneFirstName={guest.plusOneFirstName}
                  />

                  {/* Contact */}
                  <div className="flex flex-col text-xs text-slate-500 min-w-0">
                    <span className="truncate">{guest.email || "—"}</span>
                    <span>{guest.phone || "—"}</span>
                  </div>

                  {/* Invitation Type */}
                  <div className="flex justify-center">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                        guest.invitationType === "COUPLE"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {guest.invitationType === "COUPLE" ? "Couple" : "Seul"}
                    </span>
                  </div>

                  {/* Accompagnateur */}
                  <span className="text-xs text-slate-600 truncate">
                    {guest.invitationType === "COUPLE"
                      ? `${guest.plusOneFirstName || ""} ${guest.plusOneLastName || ""}`.trim() || (
                          <span className="text-slate-400 italic">
                            Non spécifié
                          </span>
                        )
                      : "—"}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1">
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
                    <button
                      onClick={() => setViewGuest(guest)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#EEF0FF] hover:text-[#1E5FF5]"
                      title="Voir le détail"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditGuest(guest);
                        setEditFirstName(guest.firstName);
                        setEditLastName(guest.lastName);
                        setEditEmail(guest.email || "");
                        setEditPhone(guest.phone || "");
                        setEditInvitationType(guest.invitationType);
                        setEditPlusOneFirstName(guest.plusOneFirstName || "");
                        setEditPlusOneLastName(guest.plusOneLastName || "");
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#EEF0FF] hover:text-[#1E5FF5]"
                      title="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setUnassignGuest(guest)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                      title="Désassigner de la table"
                    >
                      <Link2Off className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteGuest(guest)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Supprimer définitivement"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Dialogs
      ══════════════════════════════════════════════════════════════════════════ */}

      {/* ── Add Guest Dialog ────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-4">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Ajouter un invité
            </DialogTitle>
          </DialogHeader>

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-100 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("existing")}
              className={`flex-1 pb-2.5 text-sm font-semibold text-center transition-all border-b-2 cursor-pointer ${
                activeTab === "existing"
                  ? "border-[#1E5FF5] text-[#1E5FF5]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Invité existant
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("new")}
              className={`flex-1 pb-2.5 text-sm font-semibold text-center transition-all border-b-2 cursor-pointer ${
                activeTab === "new"
                  ? "border-[#1E5FF5] text-[#1E5FF5]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Créer un invité
            </button>
          </div>

          {activeTab === "existing" ? (
            <form
              onSubmit={handleAssignExistingGuest}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="existing-guest-select"
                  className="text-[14px] font-medium text-slate-700 mb-1.5 block"
                >
                  Sélectionner un invité <span className="text-red-500">*</span>
                </Label>
                {loadingUnassigned ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 h-11 px-4 border border-slate-200 rounded-xl bg-slate-50 animate-pulse">
                    Chargement des invités…
                  </div>
                ) : unassignedGuests.length === 0 ? (
                  <div className="text-sm text-slate-500 h-11 flex items-center px-4 border border-slate-200 rounded-xl bg-slate-50">
                    Aucun invité non affecté disponible.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      id="existing-guest-select"
                      value={selectedGuestId}
                      onChange={(e) => setSelectedGuestId(e.target.value)}
                      required
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs cursor-pointer"
                    >
                      <option value="">— Choisir un invité —</option>
                      {unassignedGuests.map((g) => {
                        const name =
                          g.invitationType === "COUPLE"
                            ? `Couple ${g.firstName} ${g.lastName}`.trim()
                            : `${g.firstName} ${g.lastName}`;
                        return (
                          <option key={g.id} value={g.id}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                      <Plus className="h-4 w-4 rotate-45" />
                    </div>
                  </div>
                )}
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
                    !selectedGuestId ||
                    loadingUnassigned ||
                    unassignedGuests.length === 0
                  }
                  className="h-10 px-5 rounded-xl bg-[#1E5FF5] text-white text-sm font-medium hover:bg-[#154ED0] transition-colors shadow-xs cursor-pointer"
                >
                  {createLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Ajout…
                    </span>
                  ) : (
                    "Ajouter à la table"
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleCreateGuest} className="space-y-4 pt-2">
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
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
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
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                    value={invitationType}
                    onChange={(e) =>
                      setInvitationType(e.target.value as "SINGLE" | "COUPLE")
                    }
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs cursor-pointer"
                  >
                    <option value="SINGLE">Seul</option>
                    <option value="COUPLE">Couple</option>
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                    <Plus className="h-4 w-4 rotate-45" />
                  </div>
                </div>
              </div>

              {invitationType === "COUPLE" && (
                <div className="border-t border-slate-100 pt-4 mt-2 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Accompagnateur / Conjoint
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="create-plusone-firstname"
                        className="text-[14px] font-medium text-slate-700 mb-1.5 block"
                      >
                        Prénom <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="create-plusone-firstname"
                        placeholder="Prénom"
                        value={plusOneFirstName}
                        onChange={(e) => setPlusOneFirstName(e.target.value)}
                        required
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="create-plusone-lastname"
                        className="text-[14px] font-medium text-slate-700 mb-1.5 block"
                      >
                        Nom <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="create-plusone-lastname"
                        placeholder="Nom"
                        value={plusOneLastName}
                        onChange={(e) => setPlusOneLastName(e.target.value)}
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
                  onClick={() => setCreateOpen(false)}
                  disabled={createLoading}
                  className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createLoading || !firstName.trim() || !lastName.trim()
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
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Guest Dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!editGuest} onOpenChange={(o) => !o && setEditGuest(null)}>
        <DialogContent className="max-w-md w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-5">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Modifier l&apos;invité
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditGuest} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-firstname"
                  className="text-[14px] font-medium text-slate-700 mb-1.5 block"
                >
                  Prénom <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-firstname"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  required
                  autoFocus
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-lastname"
                  className="text-[14px] font-medium text-slate-700 mb-1.5 block"
                >
                  Nom <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-lastname"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="edit-email"
                className="text-[14px] font-medium text-slate-700 mb-1.5 block"
              >
                Adresse e-mail
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="edit-phone"
                className="text-[14px] font-medium text-slate-700 mb-1.5 block"
              >
                Téléphone
              </Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="edit-invitation-type"
                className="text-[14px] font-medium text-slate-700 mb-1.5 block"
              >
                Type d&apos;invitation <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  id="edit-invitation-type"
                  value={editInvitationType}
                  onChange={(e) =>
                    setEditInvitationType(e.target.value as "SINGLE" | "COUPLE")
                  }
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none appearance-none focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs cursor-pointer"
                >
                  <option value="SINGLE">Seul</option>
                  <option value="COUPLE">Couple</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                  <Plus className="h-4 w-4 rotate-45" />
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
                    <Label
                      htmlFor="edit-plusone-firstname"
                      className="text-[14px] font-medium text-slate-700 mb-1.5 block"
                    >
                      Prénom <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-plusone-firstname"
                      placeholder="Prénom"
                      value={editPlusOneFirstName}
                      onChange={(e) => setEditPlusOneFirstName(e.target.value)}
                      required
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="edit-plusone-lastname"
                      className="text-[14px] font-medium text-slate-700 mb-1.5 block"
                    >
                      Nom <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-plusone-lastname"
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
                disabled={
                  editLoading || !editFirstName.trim() || !editLastName.trim()
                }
                className="h-10 px-5 rounded-xl bg-[#1E5FF5] text-white text-sm font-medium hover:bg-[#154ED0] transition-colors shadow-xs cursor-pointer"
              >
                {editLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Enregistrement…
                  </span>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Unassign Guest Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={!!unassignGuest}
        onOpenChange={(o) => !o && setUnassignGuest(null)}
      >
        <DialogContent className="max-w-md w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-5">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Retirer de la table
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-600">
              Êtes-vous sûr de vouloir retirer{" "}
              <strong className="text-slate-800">
                « {unassignGuest?.firstName} {unassignGuest?.lastName} »
              </strong>{" "}
              de cette table ?
            </p>
            <p className="text-xs text-slate-400">
              L&apos;invité sera toujours présent dans l&apos;événement, mais
              n&apos;aura plus de place attitrée.
            </p>
          </div>
          <DialogFooter className="bg-[#F8FAFC] border-t border-[#E8ECF4] px-6 py-4 flex justify-end gap-3 rounded-b-[24px] -mx-6 -mb-6 mt-6">
            <Button
              type="button"
              onClick={() => setUnassignGuest(null)}
              disabled={unassignLoading}
              className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              onClick={handleUnassignGuest}
              disabled={unassignLoading}
              className="h-10 px-5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors shadow-xs cursor-pointer"
            >
              {unassignLoading ? "Retrait…" : "Retirer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Guest Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={!!deleteGuest}
        onOpenChange={(o) => !o && setDeleteGuest(null)}
      >
        <DialogContent className="max-w-md w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-5">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Supprimer l&apos;invité
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3 items-start bg-red-50 text-red-700 p-4 rounded-xl border border-red-100">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">
                  Cette action est irréversible
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Êtes-vous sûr de vouloir supprimer définitivement
                  l&apos;invité{" "}
                  <strong className="text-red-900">
                    « {deleteGuest?.firstName} {deleteGuest?.lastName} »
                  </strong>{" "}
                  de l&apos;événement ?
                </p>
              </div>
            </div>
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
              onClick={handleDeleteGuest}
              disabled={deleteLoading}
              className="h-10 px-5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
            >
              {deleteLoading ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
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
        <DialogContent className="max-w-lg w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
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
                          <Plus className="h-3.5 w-3.5 rotate-45" />
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
                          <Plus className="h-3.5 w-3.5 rotate-45" />
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
                          <Plus className="h-3.5 w-3.5 rotate-45" />
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
                          <Plus className="h-3.5 w-3.5 rotate-45" />
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
                          <Plus className="h-3.5 w-3.5 rotate-45" />
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
                          <Plus className="h-3.5 w-3.5 rotate-45" />
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
                          <Plus className="h-3.5 w-3.5 rotate-45" />
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
                              <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]">
                                {row.email || "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-650 truncate max-w-[150px]">
                                {row.plusOne || "—"}
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

      {/* ── View Guest Dialog ────────────────────────────────────────────────── */}
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
                    Couple avec {viewGuest.plusOneFirstName || ""}{" "}
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
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#1E5FF5]">
                    <Armchair className="h-3.5 w-3.5 shrink-0" />
                    {table.name}
                  </span>
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

              {viewGuest.respondedAt && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Réponse reçue le {formatDate(viewGuest.respondedAt)}
                </div>
              )}

              {viewGuest.createdAt && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Ajouté le {formatDate(viewGuest.createdAt)}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="bg-[#F8FAFC] border-t border-[#E8ECF4] px-6 py-4 flex justify-between gap-3 rounded-b-[24px] -mx-6 -mb-6 mt-6">
            <Button
              type="button"
              onClick={() => {
                if (viewGuest) {
                  setEditGuest(viewGuest);
                  setEditFirstName(viewGuest.firstName);
                  setEditLastName(viewGuest.lastName);
                  setEditEmail(viewGuest.email || "");
                  setEditPhone(viewGuest.phone || "");
                  setViewGuest(null);
                  setEditInvitationType(viewGuest.invitationType);
                  setEditPlusOneFirstName(viewGuest.plusOneFirstName || "");
                  setEditPlusOneLastName(viewGuest.plusOneLastName || "");
                }
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
    </>
  );
}
