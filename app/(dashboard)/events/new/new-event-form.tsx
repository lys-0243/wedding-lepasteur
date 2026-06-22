"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CldUploadWidget } from "next-cloudinary";
import { X, ImagePlus } from "lucide-react";

type NewEventFormProps = {
  action: (formData: FormData) => Promise<void>;
};

const folder = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER ?? "wedding";
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

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

function ImageUploadSlot({
  label,
  value,
  onSuccess,
  onClear,
  aspect,
  previewClass,
}: {
  label: string;
  value: string;
  onSuccess: (url: string) => void;
  onClear: () => void;
  aspect?: number;
  previewClass: string;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>

      <CldUploadWidget
        uploadPreset={uploadPreset}
        options={{
          folder,
          maxFiles: 1,
          resourceType: "image",
          sources: ["local", "camera", "url"],
          cropping: !!aspect,
          croppingAspectRatio: aspect,
          styles: {
            palette: {
              window: "#F7F8FC",
              windowBorder: "#DEE4EF",
              tabIcon: "#534AB7",
              menuIcons: "#534AB7",
              textDark: "#1e293b",
              textLight: "#FFFFFF",
              link: "#534AB7",
              action: "#534AB7",
              inactiveTabIcon: "#94a3b8",
              error: "#dc2626",
              inProgress: "#534AB7",
              complete: "#22c55e",
              sourceBg: "#F7F8FC",
            },
          },
        }}
        onSuccess={(result) => {
          if (
            result.event === "success" &&
            typeof result.info === "object" &&
            result.info !== null &&
            "secure_url" in result.info
          ) {
            onSuccess(result.info.secure_url as string);
          }
        }}
      >
        {({ open }) => (
          <div>
            {value ? (
              <div className={`relative overflow-hidden rounded-xl border border-[#DCE2ED] ${previewClass}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt={`Aperçu ${label}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-end justify-between gap-2 p-2 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => open()}
                    className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[0.65rem] font-semibold text-slate-700 shadow hover:bg-white transition-colors cursor-pointer"
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
              <button
                type="button"
                onClick={() => open()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#B7C4E0] bg-white py-6 text-slate-400 transition-all hover:border-[#534AB7] hover:text-[#534AB7] hover:bg-[#EEF3FF] cursor-pointer"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs font-semibold">Ajouter une image</span>
              </button>
            )}
          </div>
        )}
      </CldUploadWidget>
    </div>
  );
}

export function NewEventForm({ action }: NewEventFormProps) {
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

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
          value={profileImageUrl}
          onSuccess={setProfileImageUrl}
          onClear={() => setProfileImageUrl("")}
          aspect={1}
          previewClass="h-32"
        />
        <ImageUploadSlot
          label="Photo de couverture"
          value={coverImageUrl}
          onSuccess={setCoverImageUrl}
          onClear={() => setCoverImageUrl("")}
          previewClass="h-32"
        />
      </div>

      {/* Hidden inputs to pass URLs to the form action */}
      <input type="hidden" name="profileImageUrl" value={profileImageUrl} />
      <input type="hidden" name="coverImageUrl" value={coverImageUrl} />

      <div className="pt-2">
        <SubmitButton disabled={false} />
      </div>
    </form>
  );
}
