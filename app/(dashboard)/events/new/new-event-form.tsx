"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ImagePlus, Loader2, X } from "lucide-react";

type NewEventFormProps = {
  action: (formData: FormData) => Promise<void>;
  catalogDrinks: Array<{ id: string; name: string; isAlcoholic: boolean }>;
};

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";
const FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER ?? "wedding";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex h-10 items-center justify-center rounded-lg bg-[#534AB7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#41399B] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enregistrement..." : "Enregistrer l'evenement"}
    </button>
  );
}

/** A single image upload slot with native file picker */
function ImageUploadSlot({
  label,
  fieldName,
  value,
  uploading,
  onChange,
  onClear,
  previewClass = "h-32",
}: {
  label: string;
  fieldName: string;
  value: string;
  uploading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  previewClass?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />

      {value ? (
        /* Preview with hover overlay */
        <div
          className={`group relative overflow-hidden rounded-xl border border-[#DCE2ED] ${previewClass}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`Aperçu ${label}`}
            className="h-full w-full object-cover"
          />
          {/* Hover actions */}
          <div className="absolute inset-0 flex items-end justify-between gap-2 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[0.65rem] font-semibold text-slate-700 shadow hover:bg-white transition-colors cursor-pointer disabled:opacity-60"
            >
              <ImagePlus className="h-3 w-3" />
              Changer
            </button>
            <button
              type="button"
              onClick={onClear}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white shadow hover:bg-red-600 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Upload zone */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#B7C4E0] bg-white py-7 text-slate-400 transition-all hover:border-[#534AB7] hover:text-[#534AB7] hover:bg-[#EEF3FF] cursor-pointer disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              <span className="text-xs font-semibold">Ajouter une image</span>
            </>
          )}
        </button>
      )}

      {/* Passes the uploaded URL to the server action */}
      <input type="hidden" name={fieldName} value={value} />
    </div>
  );
}

export function NewEventForm({ action, catalogDrinks }: NewEventFormProps) {
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedDrinkIds, setSelectedDrinkIds] = useState<string[]>([]);

  function toggleDrink(drinkId: string) {
    setSelectedDrinkIds((prev) =>
      prev.includes(drinkId)
        ? prev.filter((id) => id !== drinkId)
        : [...prev, drinkId],
    );
  }

  const uploadFile = async (
    file: File,
    setter: (url: string) => void,
    field: string,
  ) => {
    setUploadError(null);
    setUploadingField(field);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", FOLDER);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData },
      );

      const data = (await res.json()) as {
        secure_url?: string;
        error?: { message?: string };
      };

      if (!res.ok || !data.secure_url) {
        throw new Error(data.error?.message ?? "Échec de l'upload.");
      }

      setter(data.secure_url);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Erreur lors de l'upload.",
      );
    } finally {
      setUploadingField(null);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file, setProfileImageUrl, "profileImageUrl");
    e.target.value = "";
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file, setCoverImageUrl, "coverImageUrl");
    e.target.value = "";
  };

  return (
    <form action={action} className="grid gap-4 sm:gap-5">
      <div className="grid gap-1.5">
        <label htmlFor="title" className="text-sm font-semibold text-slate-700">
          Nom de l&apos;evenement
        </label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="Ex: Mariage de Sarah et Adam"
          className="h-10 w-full rounded-lg border border-[#DCE2ED] bg-white px-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#B7C4E0]"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label
            htmlFor="eventDate"
            className="text-sm font-semibold text-slate-700"
          >
            Date
          </label>
          <input
            id="eventDate"
            name="eventDate"
            type="date"
            className="h-10 w-full rounded-lg border border-[#DCE2ED] bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-[#B7C4E0]"
          />
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="venue"
            className="text-sm font-semibold text-slate-700"
          >
            Lieu
          </label>
          <input
            id="venue"
            name="venue"
            type="text"
            placeholder="Ex: Domaine des Oliviers"
            className="h-10 w-full rounded-lg border border-[#DCE2ED] bg-white px-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#B7C4E0]"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="description"
          className="text-sm font-semibold text-slate-700"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Informations pratiques, ambiance, details importants..."
          className="w-full rounded-lg border border-[#DCE2ED] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#B7C4E0]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ImageUploadSlot
          label="Photo profil"
          fieldName="profileImageUrl"
          value={profileImageUrl}
          uploading={uploadingField === "profileImageUrl"}
          onChange={handleProfileChange}
          onClear={() => setProfileImageUrl("")}
          previewClass="h-36"
        />
        <ImageUploadSlot
          label="Photo de couverture"
          fieldName="coverImageUrl"
          value={coverImageUrl}
          uploading={uploadingField === "coverImageUrl"}
          onChange={handleCoverChange}
          onClear={() => setCoverImageUrl("")}
          previewClass="h-36"
        />
      </div>

      {uploadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {uploadError}
        </p>
      )}

      <div className="grid gap-2 rounded-xl border border-[#DCE2ED] bg-white p-3">
        <p className="text-sm font-semibold text-slate-700">
          Boissons de l&apos;événement (optionnel)
        </p>
        <p className="text-xs text-slate-500">
          Sélectionne les boissons disponibles pour cet événement.
        </p>
        <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-slate-100 p-2 sm:grid-cols-2">
          {catalogDrinks.map((drink) => {
            const checked = selectedDrinkIds.includes(drink.id);
            return (
              <label
                key={drink.id}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm ${
                  checked
                    ? "border-[#534AB7] bg-[#EEF0FF] text-[#3B3390]"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span className="truncate">{drink.name}</span>
                <span className="text-[0.65rem] font-semibold uppercase opacity-70">
                  {drink.isAlcoholic ? "Alcool" : "Sans alcool"}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDrink(drink.id)}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
        <input
          type="hidden"
          name="selectedDrinkIds"
          value={JSON.stringify(selectedDrinkIds)}
        />
      </div>

      <div className="pt-2">
        <SubmitButton disabled={Boolean(uploadingField)} />
      </div>
    </form>
  );
}
