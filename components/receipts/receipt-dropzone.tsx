"use client";

import { useRef, useState } from "react";
import { Camera, ImageUp } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/heic,image/heif";
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * `capture="environment"` opens the rear camera directly on mobile browsers
 * that support it, while still falling back to an ordinary file picker
 * (photo library or desktop file browser) everywhere else — one input
 * covers both "take a photo" and "upload an existing image".
 */
export function ReceiptDropzone({
  onAnalyze,
  pending,
  error,
}: {
  onAnalyze: (file: File) => void;
  pending: boolean;
  error: string | null;
}) {
  const dict = useDictionary().receipts;
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setLocalError(dict.fileTooLarge);
      setSelected(null);
      return;
    }
    setLocalError(null);
    setSelected(file);
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="border-border bg-card flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center"
      >
        {selected ? (
          <p className="text-foreground text-sm font-medium">{selected.name}</p>
        ) : (
          <>
            <ImageUp aria-hidden className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground text-sm">{dict.chooseFile}</p>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      {(localError || error) && <p className="text-danger text-sm">{localError ?? error}</p>}
      <Button
        type="button"
        disabled={!selected}
        loading={pending}
        onClick={() => selected && onAnalyze(selected)}
        className="gap-2"
      >
        <Camera aria-hidden className="h-4 w-4 shrink-0" />
        {dict.analyze}
      </Button>
    </div>
  );
}
