"use client";

import { useRef, useState } from "react";
import { ReceiptScanner } from "./scanner-preview";
import { Camera, Check, ImageUp } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/heic,image/heif";
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Two separate file inputs, not one: `capture="environment"` makes some
 * mobile browsers (notably Android Chrome) jump straight to the camera app
 * and skip the gallery entirely, so "take a photo" and "choose an existing
 * one" need their own triggers rather than sharing a single input.
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
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
      <ReceiptScanner file={selected} pending={pending} />
      <div className="border-border bg-card flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
        {selected ? (
          <>
            <Check aria-hidden className="text-primary h-6 w-6" />
            <p className="text-foreground text-sm font-medium">{selected.name}</p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">{dict.chooseFile}</p>
        )}

        <div className="flex w-full gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => cameraInputRef.current?.click()}
            className="gap-2"
          >
            <Camera aria-hidden className="h-4 w-4 shrink-0" />
            {dict.takePhoto}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => libraryInputRef.current?.click()}
            className="gap-2"
          >
            <ImageUp aria-hidden className="h-4 w-4 shrink-0" />
            {dict.chooseFromLibrary}
          </Button>
        </div>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleChange}
      />

      {(localError || error) && (
        <p role="alert" className="text-danger text-sm">
          {localError ?? error}
        </p>
      )}
      <Button
        type="button"
        disabled={!selected}
        loading={pending}
        onClick={() => selected && onAnalyze(selected)}
      >
        {dict.analyze}
      </Button>
    </div>
  );
}
