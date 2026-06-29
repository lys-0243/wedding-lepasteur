"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { Plus, Upload, Pencil, Trash2, Users, FileSpreadsheet, X, AlertTriangle, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TableRow = {
  id: string;
  name: string;
  capacity: number;
  _count: { guests: number };
};

type Props = {
  eventId: string;
  initialTables: TableRow[];
};

export function TablesClient({ eventId, initialTables }: Props) {
  const [tables, setTables] = useState<TableRow[]>(initialTables);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // ── Create dialog ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCapacity, setCreateCapacity] = useState<string>("10");
  const [createLoading, setCreateLoading] = useState(false);

  // ── Edit dialog ────────────────────────────────────────────────────────────
  const [editTable, setEditTable] = useState<TableRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState<string>("10");
  const [editLoading, setEditLoading] = useState(false);

  // ── Delete confirmation ────────────────────────────────────────────────────
  const [deleteTable, setDeleteTable] = useState<TableRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Batch download ─────────────────────────────────────────────────────────
  const [downloadingTableId, setDownloadingTableId] = useState<string | null>(null);

  async function handleDownloadAllInvitations(tableId: string) {
    try {
      const res = await fetch(`/api/events/${eventId}/tables/${tableId}/guests`);
      const guests = await res.json();

      if (!Array.isArray(guests) || guests.length === 0) {
        toast.error("Aucun invité dans cette table.");
        return;
      }

      setDownloadingTableId(tableId);

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
      setDownloadingTableId(null);
    }
  }

  // ── Import dialog ──────────────────────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [mappedColumns, setMappedColumns] = useState({ name: "", capacity: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExportExcel() {
    try {
      const exportData = tables.map((t) => ({
        "Nom de la table": t.name,
        "Capacité": t.capacity,
        "Nombre d'invités": t._count.guests,
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tables");
      XLSX.writeFile(workbook, `tables-evenement-${eventId}.xlsx`);
      toast.success("La liste des tables a été exportée.");
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'exporter la liste des tables.");
    }
  }

  // ── Refresh helper ─────────────────────────────────────────────────────────
  async function refreshTables() {
    const res = await fetch(`/api/events/${eventId}/tables`);
    if (res.ok) {
      const data = await res.json();
      startTransition(() => setTables(data));
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, capacity: Number(createCapacity) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la création.");
        return;
      }
      setTables((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setCreateOpen(false);
      setCreateName("");
      setCreateCapacity("10");
      toast.success(`Table « ${data.name} » créée.`);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTable) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/tables/${editTable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, capacity: Number(editCapacity) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la modification.");
        return;
      }
      setTables((prev) =>
        prev.map((t) => (t.id === data.id ? data : t)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditTable(null);
      toast.success(`Table « ${data.name} » mise à jour.`);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTable) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/tables/${deleteTable.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Erreur lors de la suppression.");
        return;
      }
      setTables((prev) => prev.filter((t) => t.id !== deleteTable.id));
      toast.success(`Table « ${deleteTable.name} » supprimée.`);
      setDeleteTable(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  // Helper to extract sheet headers from worksheets
  function getSheetHeaders(sheet: XLSX.WorkSheet): string[] {
    const headers: string[] = [];
    const range = XLSX.utils.decode_range(sheet["!ref"] || "");
    const R = range.s.r; // Row 0
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

  // Client-side file parsing
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
        
        // Extract rows as raw JSON objects
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
        if (rawRows.length === 0) {
          toast.error("Le fichier Excel est vide.");
          return;
        }

        const headers = getSheetHeaders(sheet);
        setFileHeaders(headers);
        setRawData(rawRows);
        setUploadedFileName(file.name);

        // Smart column matching
        const nameCol = headers.find(h => /nom|name|titre|title/i.test(h)) || headers[0] || "";
        const capCol = headers.find(h => /capacit|places|invit|capacity|qty|size|nombre/i.test(h)) || headers[1] || "";
        setMappedColumns({ name: nameCol, capacity: capCol });

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
    if (file) {
      processFile(file);
    }
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
    setMappedColumns({ name: "", capacity: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleImportSubmit() {
    if (!mappedColumns.name || !mappedColumns.capacity) {
      toast.error("Veuillez mapper toutes les colonnes requises.");
      return;
    }

    setImportLoading(true);
    try {
      const parsedTables = rawData
        .map((row) => {
          const name = String(row[mappedColumns.name] || "").trim();
          const capacity = Number(row[mappedColumns.capacity]) || 0;
          return { name, capacity };
        })
        .filter((t) => t.name.length > 0 && t.capacity > 0);

      if (parsedTables.length === 0) {
        toast.error("Aucune table valide à importer.");
        return;
      }

      const res = await fetch(`/api/events/${eventId}/tables/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables: parsedTables }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'importation.");
        return;
      }

      toast.success(`Importation réussie : ${data.created} table(s) ajoutée(s).`);
      setImportOpen(false);
      clearUploadedFile();
      await refreshTables();
    } catch (err) {
      console.error(err);
      toast.error("Erreur serveur lors de l'importation.");
    } finally {
      setImportLoading(false);
    }
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = tables.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalCapacity = tables.reduce((acc, t) => acc + t.capacity, 0);
  const totalGuests = tables.reduce((acc, t) => acc + t._count.guests, 0);

  // Compute mapped previews
  const previewRows = rawData.slice(0, 5).map((row) => {
    const name = mappedColumns.name ? String(row[mappedColumns.name] || "").trim() : "";
    const capacity = mappedColumns.capacity ? Number(row[mappedColumns.capacity]) || 0 : 0;
    return { name, capacity };
  });

  return (
    <>
      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 lg:text-2xl">
            Tables
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {tables.length} table{tables.length !== 1 ? "s" : ""} · {totalGuests}/{totalCapacity} places occupées
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Import Excel Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="gap-2 border-[#E8ECF4] text-slate-600 hover:bg-slate-50 cursor-pointer h-10 px-4 rounded-xl"
          >
            <Upload className="h-4 w-4" />
            Importer Excel
          </Button>

          {/* Export Excel Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2 border-[#E8ECF4] text-slate-600 hover:bg-slate-50 cursor-pointer h-10 px-4 rounded-xl"
          >
            <Download className="h-4 w-4" />
            Exporter Excel
          </Button>

          {/* Add table */}
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-[#1E5FF5] text-white hover:bg-[#154ED0] cursor-pointer h-10 px-4 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Ajouter une table
          </Button>
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="mt-5 flex items-center gap-3">
        <Input
          placeholder="Rechercher une table…"
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

      {/* ── Table list ────────────────────────────────────────────────────── */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#E8ECF4] bg-white shadow-sm">
        {/* Table head */}
        <div className="grid grid-cols-[auto_1fr_120px_100px_140px] items-center border-b border-[#E8ECF4] bg-slate-50/60 px-5 py-3 text-[0.7rem] font-bold uppercase tracking-widest text-slate-400">
          <span className="w-8" />
          <span>Nom</span>
          <span className="text-center">Capacité</span>
          <span className="text-center">Invités</span>
          <span className="text-center">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <FileSpreadsheet className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {search ? "Aucune table ne correspond à votre recherche." : "Aucune table pour cet événement."}
            </p>
            {!search && (
              <button
                onClick={() => setCreateOpen(true)}
                className="mt-1 text-sm font-semibold text-[#1E5FF5] hover:underline"
              >
                Créer la première table →
              </button>
            )}
          </div>
        ) : (
          <ul>
            {filtered.map((table, i) => {
              const occupancy = table.capacity > 0 ? table._count.guests / table.capacity : 0;
              const pct = Math.min(Math.round(occupancy * 100), 100);
              const barColor =
                pct >= 90
                  ? "bg-red-400"
                  : pct >= 60
                  ? "bg-amber-400"
                  : "bg-emerald-400";

              return (
                <li
                  key={table.id}
                  className={`grid grid-cols-[auto_1fr_120px_100px_140px] items-center gap-2 px-5 py-3.5 transition-colors hover:bg-slate-50/60 ${
                    i !== filtered.length - 1 ? "border-b border-[#E8ECF4]" : ""
                  }`}
                >
                  {/* Index */}
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF0FF] text-xs font-bold text-[#1E5FF5]">
                    {i + 1}
                  </span>

                  {/* Name */}
                  <Link
                    href={`/events/${eventId}/tables/${table.id}`}
                    className="truncate text-sm font-semibold text-slate-800 hover:text-[#1E5FF5] hover:underline cursor-pointer"
                  >
                    {table.name}
                  </Link>

                  {/* Capacity */}
                  <span className="text-center text-sm text-slate-600">
                    {table.capacity} places
                  </span>

                  {/* Guests + progress */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {table._count.guests}/{table.capacity}
                    </div>
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1">
                    <Link
                      href={`/events/${eventId}/tables/${table.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#EEF0FF] hover:text-[#1E5FF5]"
                      title="Voir la table"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => void handleDownloadAllInvitations(table.id)}
                      disabled={downloadingTableId === table.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-purple-50 hover:text-purple-600 disabled:opacity-40"
                      title="Télécharger les invitations"
                    >
                      {downloadingTableId === table.id ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditTable(table);
                        setEditName(table.name);
                        setEditCapacity(String(table.capacity));
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#EEF0FF] hover:text-[#1E5FF5]"
                      title="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTable(table)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Supprimer"
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

      {/* ── Create dialog ───────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-5">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Nouvelle table
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-name" className="text-[14px] font-medium text-slate-700 mb-1.5 block">
                Nom de la table <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-name"
                placeholder="Ex : Table 1, Table des mariés…"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
                autoFocus
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs placeholder-slate-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-capacity" className="text-[14px] font-medium text-slate-700 mb-1.5 block">
                Nombre d&apos;invités <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-capacity"
                type="number"
                min={1}
                max={999}
                placeholder="10"
                value={createCapacity}
                onChange={(e) => setCreateCapacity(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs placeholder-slate-400"
              />
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
                disabled={createLoading || !createName.trim() || !createCapacity}
                className="h-10 px-5 rounded-xl bg-[#1E5FF5] text-white text-sm font-medium hover:bg-[#154ED0] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

      {/* ── Edit dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={!!editTable} onOpenChange={(o) => !o && setEditTable(null)}>
        <DialogContent className="max-w-md w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-5">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Modifier la table
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-[14px] font-medium text-slate-700 mb-1.5 block">
                Nom de la table <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                autoFocus
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs placeholder-slate-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-capacity" className="text-[14px] font-medium text-slate-700 mb-1.5 block">
                Nombre d&apos;invités <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-capacity"
                type="number"
                min={1}
                max={999}
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none transition-all focus:border-[#1E5FF5] focus:ring-2 focus:ring-blue-100/50 shadow-xs placeholder-slate-400"
              />
            </div>
            <DialogFooter className="bg-[#F8FAFC] border-t border-[#E8ECF4] px-6 py-4 flex justify-end gap-3 rounded-b-[24px] -mx-6 -mb-6 mt-6">
              <Button
                type="button"
                onClick={() => setEditTable(null)}
                disabled={editLoading}
                className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={editLoading || !editName.trim()}
                className="h-10 px-5 rounded-xl bg-[#1E5FF5] text-white text-sm font-medium hover:bg-[#154ED0] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

      {/* ── Delete confirmation dialog ───────────────────────────────────────── */}
      <Dialog open={!!deleteTable} onOpenChange={(o) => !o && setDeleteTable(null)}>
        <DialogContent className="max-w-md w-full rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-5">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Supprimer la table
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3 items-start bg-red-50 text-red-700 p-4 rounded-xl border border-red-100">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Cette action est irréversible</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Êtes-vous sûr de vouloir supprimer la table <strong className="text-red-900">« {deleteTable?.name} »</strong> ?
                </p>
              </div>
            </div>
            {deleteTable && deleteTable._count.guests > 0 && (
              <p className="text-sm text-slate-500">
                ⚠ Il y a actuellement <strong className="text-slate-800">{deleteTable._count.guests} invité(s)</strong> assigné(s) à cette table. Ils seront automatiquement désassignés.
              </p>
            )}
          </div>
          <DialogFooter className="bg-[#F8FAFC] border-t border-[#E8ECF4] px-6 py-4 flex justify-end gap-3 rounded-b-[24px] -mx-6 -mb-6 mt-6">
            <Button
              type="button"
              onClick={() => setDeleteTable(null)}
              disabled={deleteLoading}
              className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="h-10 px-5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
            >
              {deleteLoading ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import dialog ───────────────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={(o) => { if (!o) { setImportOpen(false); clearUploadedFile(); } }}>
        <DialogContent className="w-[70vw] max-w-none rounded-[24px] bg-white p-6 shadow-2xl border-none gap-0 overflow-hidden outline-none">
          <DialogHeader className="pb-4 border-b border-[#E8ECF4] mb-4">
            <DialogTitle className="text-[18px] font-bold text-slate-800">
              Importer des tables
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Chargez un fichier Excel avec les colonnes Nom, Capacité.
            </p>
          </DialogHeader>

          {/* Main content based on file status */}
          <div className="py-2">
            {!uploadedFileName ? (
              // Step 1: Upload Dropzone (Image 3 style)
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
              // Step 2: Mapping and Preview (Image 2 style)
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {/* File badge with delete icon */}
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

                {/* Column Correspondence section */}
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Correspondance des colonnes
                  </h3>

                  <div className="space-y-2.5">
                    {/* Nom column mapping */}
                    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                      <Label className="text-[14px] font-medium text-slate-700">
                        Nom <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative w-2/3">
                        <select
                          value={mappedColumns.name}
                          onChange={(e) => setMappedColumns({ ...mappedColumns, name: e.target.value })}
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

                    {/* Capacité column mapping */}
                    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                      <Label className="text-[14px] font-medium text-slate-700">
                        Capacité <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative w-2/3">
                        <select
                          value={mappedColumns.capacity}
                          onChange={(e) => setMappedColumns({ ...mappedColumns, capacity: e.target.value })}
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
                  </div>
                </div>

                {/* Preview Section */}
                {mappedColumns.name && mappedColumns.capacity && (
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-2">
                      Aperçu (5 premières lignes)
                    </h3>

                    <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/20">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2 font-semibold text-slate-500">Nom de la table</th>
                            <th className="px-3 py-2 font-semibold text-slate-500">Capacité (Invités)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-100 last:border-none">
                              <td className="px-3 py-2 text-slate-700 font-medium truncate max-w-[200px]">
                                {row.name || <span className="text-slate-400 italic">Vide</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {row.capacity} places
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
                disabled={importLoading || !mappedColumns.name || !mappedColumns.capacity}
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
