"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Plus, Search, Trash2, Upload, Wine, GlassWater } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DrinkRow = {
  id: string;
  name: string;
  category: string | null;
  isAlcoholic: boolean;
  imageUrl: string | null;
  _count?: { guestDrinks: number };
};

type Props = {
  eventId: string;
  initialDrinks: DrinkRow[];
  catalog: DrinkRow[];
};

export function DrinksClient({ eventId, initialDrinks, catalog }: Props) {
  const [selectedDrinks, setSelectedDrinks] =
    useState<DrinkRow[]>(initialDrinks);
  const [catalogDrinks, setCatalogDrinks] = useState<DrinkRow[]>(catalog);
  const [search, setSearch] = useState("");
  const [alcoholFilter, setAlcoholFilter] = useState<
    "ALL" | "ALCOHOL" | "NO_ALCOHOL"
  >("ALL");
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createIsAlcoholic, setCreateIsAlcoholic] = useState(true);
  const [createImageUrl, setCreateImageUrl] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [mappedColumns, setMappedColumns] = useState({
    name: "",
    category: "",
    isAlcoholic: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refreshSelectedDrinks() {
    const res = await fetch(`/api/events/${eventId}/drinks`);
    if (!res.ok) return;
    const data = (await res.json()) as DrinkRow[];
    startTransition(() => setSelectedDrinks(data));
  }

  async function refreshCatalog() {
    const res = await fetch("/api/drinks");
    if (!res.ok) return;
    const data = (await res.json()) as DrinkRow[];
    startTransition(() => setCatalogDrinks(data));
  }

  const selectedIds = useMemo(
    () => new Set(selectedDrinks.map((d) => d.id)),
    [selectedDrinks],
  );

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalogDrinks.filter((drink) => {
      const matchSearch =
        !q ||
        drink.name.toLowerCase().includes(q) ||
        (drink.category ?? "").toLowerCase().includes(q);

      const matchAlcohol =
        alcoholFilter === "ALL" ||
        (alcoholFilter === "ALCOHOL" && drink.isAlcoholic) ||
        (alcoholFilter === "NO_ALCOHOL" && !drink.isAlcoholic);

      return matchSearch && matchAlcohol;
    });
  }, [catalogDrinks, search, alcoholFilter]);

  async function addDrinkToEvent(drinkId: string) {
    const res = await fetch(`/api/events/${eventId}/drinks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drinkId }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload.error ?? "Impossible d'ajouter la boisson.");
      return;
    }

    await refreshSelectedDrinks();
    toast.success("Boisson ajoutée à l'événement.");
  }

  async function removeDrinkFromEvent(drinkId: string) {
    const res = await fetch(`/api/events/${eventId}/drinks/${drinkId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload.error ?? "Impossible de retirer la boisson.");
      return;
    }

    await refreshSelectedDrinks();
    toast.success("Boisson retirée de l'événement.");
  }

  async function handleCreateGlobalDrink(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const res = await fetch("/api/drinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          category: createCategory,
          isAlcoholic: createIsAlcoholic,
          imageUrl: createImageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Impossible de créer la boisson.");
        return;
      }

      await addDrinkToEvent(data.id);
      await refreshCatalog();

      setCreateOpen(false);
      setCreateName("");
      setCreateCategory("");
      setCreateIsAlcoholic(true);
      setCreateImageUrl("");
      toast.success("Boisson globale créée.");
    } finally {
      setCreateLoading(false);
    }
  }

  function getSheetHeaders(sheet: XLSX.WorkSheet): string[] {
    const headers: string[] = [];
    const range = XLSX.utils.decode_range(sheet["!ref"] || "");
    const R = range.s.r;
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = { c: C, r: R };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      const cell = sheet[cellRef];
      if (cell && cell.t) {
        headers.push(String(cell.v).trim());
      } else {
        headers.push(`Colonne ${C + 1}`);
      }
    }
    return headers;
  }

  function processFile(file: File) {
    setImportLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
        });

        if (rows.length === 0) {
          toast.error("Le fichier est vide.");
          return;
        }

        const headers = getSheetHeaders(sheet);
        setRawData(rows);
        setFileHeaders(headers);
        setUploadedFileName(file.name);
        setMappedColumns({
          name:
            headers.find((h) => /nom|name|boisson/i.test(h)) ??
            headers[0] ??
            "",
          category: headers.find((h) => /cat/i.test(h)) ?? "",
          isAlcoholic: headers.find((h) => /alcool|alcohol|alc/i.test(h)) ?? "",
        });
      } catch (error) {
        console.error(error);
        toast.error("Impossible de lire le fichier.");
      } finally {
        setImportLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  async function submitImport() {
    if (!mappedColumns.name) {
      toast.error("Associe au moins la colonne du nom.");
      return;
    }

    setImportLoading(true);
    try {
      const drinks = rawData
        .map((row) => {
          const name = String(row[mappedColumns.name] || "").trim();
          const category = mappedColumns.category
            ? String(row[mappedColumns.category] || "").trim()
            : "";

          let isAlcoholic = true;
          if (mappedColumns.isAlcoholic) {
            const raw = String(row[mappedColumns.isAlcoholic] || "")
              .trim()
              .toLowerCase();
            isAlcoholic = [
              "true",
              "oui",
              "yes",
              "1",
              "alcool",
              "alcoolise",
              "alcoolisé",
            ].includes(raw);
          }

          return { name, category, isAlcoholic };
        })
        .filter((d) => d.name.length > 0);

      if (drinks.length === 0) {
        toast.error("Aucune ligne valide à importer.");
        return;
      }

      const res = await fetch(`/api/events/${eventId}/drinks/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drinks }),
      });

      const payload = await res.json();
      if (!res.ok) {
        toast.error(payload.error ?? "Erreur pendant l'import.");
        return;
      }

      await Promise.all([refreshCatalog(), refreshSelectedDrinks()]);
      toast.success(
        `Import terminé: ${payload.linked ?? 0} boisson(s) liée(s).`,
      );
      setImportOpen(false);
      setRawData([]);
      setFileHeaders([]);
      setUploadedFileName(null);
      setMappedColumns({ name: "", category: "", isAlcoholic: "" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
            Boissons
          </h1>
          <p className="text-sm text-slate-500">
            Catalogue global + sélection de l&apos;événement
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Importer Excel
          </Button>
          <Button
            className="cursor-pointer"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nouvelle boisson globale
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E8ECF4] bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Boissons de cet événement
        </h2>
        {selectedDrinks.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune boisson sélectionnée.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedDrinks.map((drink) => (
              <button
                key={drink.id}
                type="button"
                onClick={() => void removeDrinkFromEvent(drink.id)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                title="Retirer de l'événement"
              >
                {drink.isAlcoholic ? (
                  <Wine className="h-3.5 w-3.5" />
                ) : (
                  <GlassWater className="h-3.5 w-3.5" />
                )}
                <span>{drink.name}</span>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#E8ECF4] bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Catalogue global
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="h-9 w-full sm:w-52 pl-9"
              />
            </div>
            <select
              value={alcoholFilter}
              onChange={(e) =>
                setAlcoholFilter(
                  e.target.value as "ALL" | "ALCOHOL" | "NO_ALCOHOL",
                )
              }
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
            >
              <option value="ALL">Tous</option>
              <option value="ALCOHOL">Alcool</option>
              <option value="NO_ALCOHOL">Sans alcool</option>
            </select>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCatalog.map((drink) => {
            const alreadySelected = selectedIds.has(drink.id);
            return (
              <button
                key={drink.id}
                type="button"
                onClick={() => {
                  if (!alreadySelected) {
                    void addDrinkToEvent(drink.id);
                  }
                }}
                disabled={alreadySelected || isPending}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                  alreadySelected
                    ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-[#1E5FF5] hover:bg-blue-50"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {drink.isAlcoholic ? (
                    <Wine className="h-4 w-4" />
                  ) : (
                    <GlassWater className="h-4 w-4" />
                  )}
                  {drink.name}
                </span>
                <span className="text-xs font-semibold">
                  {alreadySelected ? "Ajoutée" : "Ajouter"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Créer une boisson globale</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateGlobalDrink} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex: Mojito"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Catégorie (optionnel)</Label>
              <Input
                value={createCategory}
                onChange={(e) => setCreateCategory(e.target.value)}
                placeholder="Ex: Cocktail"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Image URL (optionnel)</Label>
              <Input
                value={createImageUrl}
                onChange={(e) => setCreateImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <select
                value={createIsAlcoholic ? "ALCOHOL" : "NO_ALCOHOL"}
                onChange={(e) =>
                  setCreateIsAlcoholic(e.target.value === "ALCOHOL")
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="ALCOHOL">Alcool</option>
                <option value="NO_ALCOHOL">Sans alcool</option>
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createLoading || createName.trim().length === 0}
              >
                {createLoading ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Importer des boissons</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
              }}
            />

            {uploadedFileName && (
              <p className="text-sm text-slate-600">
                Fichier: {uploadedFileName}
              </p>
            )}

            {fileHeaders.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Nom</Label>
                  <select
                    value={mappedColumns.name}
                    onChange={(e) =>
                      setMappedColumns((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                  >
                    {fileHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Catégorie</Label>
                  <select
                    value={mappedColumns.category}
                    onChange={(e) =>
                      setMappedColumns((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                  >
                    <option value="">Aucune</option>
                    {fileHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Alcoolisé</Label>
                  <select
                    value={mappedColumns.isAlcoholic}
                    onChange={(e) =>
                      setMappedColumns((prev) => ({
                        ...prev,
                        isAlcoholic: e.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                  >
                    <option value="">Par défaut: alcool</option>
                    {fileHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Fermer
            </Button>
            <Button
              onClick={() => void submitImport()}
              disabled={importLoading || rawData.length === 0}
            >
              {importLoading ? "Import en cours..." : "Importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
