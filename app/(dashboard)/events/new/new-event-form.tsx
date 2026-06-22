"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type NewEventFormProps = {
  action: (formData: FormData) => Promise<void>;
};

type UploadKind = "profileImageUrl" | "coverImageUrl";

const imagekitPublicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
const imagekitFolder = process.env.NEXT_PUBLIC_IMAGEKIT_FOLDER ?? "wedding";

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

export function NewEventForm({ action }: NewEventFormProps) {
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const imageKitReady = Boolean(imagekitPublicKey);

  const uploadToImageKit = async (kind: UploadKind, file: File) => {
    if (!imagekitPublicKey) {
      setUploadError(
        "Configuration ImageKit manquante. Ajoutez NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY.",
      );
      return;
    }

    setUploadError(null);
    setUploading(kind);

    try {
      const authResponse = await fetch("/api/imagekit/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          folder: imagekitFolder,
          useUniqueFileName: true,
        }),
      });

      const authPayload = (await authResponse.json()) as {
        token?: string;
        error?: string;
      };

      if (!authResponse.ok || !authPayload.token) {
        throw new Error(
          authPayload.error ?? "Impossible de générer le token ImageKit.",
        );
      }

      const uploadBody = new FormData();
      uploadBody.append("file", file);
      uploadBody.append("fileName", file.name);
      uploadBody.append("folder", imagekitFolder);
      uploadBody.append("useUniqueFileName", "true");
      uploadBody.append("token", authPayload.token);

      const response = await fetch(
        "https://upload.imagekit.io/api/v2/files/upload",
        {
          method: "POST",
          body: uploadBody,
        },
      );

      const payload = (await response.json()) as {
        url?: string;
        error?: { message?: string };
      };

      if (!response.ok || !payload.url) {
        throw new Error(
          payload.error?.message ?? "Upload ImageKit impossible.",
        );
      }

      if (kind === "profileImageUrl") {
        setProfileImageUrl(payload.url);
      } else {
        setCoverImageUrl(payload.url);
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Erreur lors de l'upload.",
      );
    } finally {
      setUploading(null);
    }
  };

  const onPickFile = async (
    kind: UploadKind,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await uploadToImageKit(kind, file);
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
        <div className="grid gap-1.5">
          <label
            htmlFor="profileImageFile"
            className="text-sm font-semibold text-slate-700"
          >
            Photo profile
          </label>
          <input
            id="profileImageFile"
            name="profileImageFile"
            type="file"
            accept="image/*"
            onChange={(event) => onPickFile("profileImageUrl", event)}
            className="block w-full rounded-lg border border-[#DCE2ED] bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#EEF3FF] file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
          />
          {uploading === "profileImageUrl" && (
            <p className="text-xs text-slate-500">Upload en cours...</p>
          )}
          {profileImageUrl && (
            <p className="text-xs text-slate-500">Image profile uploadée.</p>
          )}
          <input type="hidden" name="profileImageUrl" value={profileImageUrl} />
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="coverImageFile"
            className="text-sm font-semibold text-slate-700"
          >
            Photo de couverture
          </label>
          <input
            id="coverImageFile"
            name="coverImageFile"
            type="file"
            accept="image/*"
            onChange={(event) => onPickFile("coverImageUrl", event)}
            className="block w-full rounded-lg border border-[#DCE2ED] bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#EEF3FF] file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
          />
          {uploading === "coverImageUrl" && (
            <p className="text-xs text-slate-500">Upload en cours...</p>
          )}
          {coverImageUrl && (
            <p className="text-xs text-slate-500">Image couverture uploadée.</p>
          )}
          <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
        </div>
      </div>

      {!imageKitReady && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Configurez NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY pour activer l&apos;upload.
        </p>
      )}

      {uploadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {uploadError}
        </p>
      )}

      <div className="pt-2">
        <SubmitButton disabled={Boolean(uploading)} />
      </div>
    </form>
  );
}
