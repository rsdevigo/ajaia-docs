"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { IMPORT_EXTENSIONS, IMPORT_MAX_BYTES, detectKind } from "@/lib/import-rules";

type Phase = "idle" | "uploading" | "creating";

async function apiError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  return data?.error ?? fallback;
}

/** Drop zone + file picker. Creates a NEW document from the uploaded file, then opens it. */
export default function ImportFile() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const busy = phase !== "idle";

  async function importFile(file: File) {
    setError(null);
    // Quick checks for fast feedback; the server validates everything again.
    if (!detectKind(file.name)) return setError("Unsupported file type. Supported: .txt, .md, .docx");
    if (file.size > IMPORT_MAX_BYTES) return setError("File is too large (max 2 MB)");

    try {
      setPhase("uploading");
      const body = new FormData();
      body.append("file", file);
      const upload = await fetch("/api/documents/import", { method: "POST", body });
      if (!upload.ok) throw new Error(await apiError(upload, "Could not import this file"));
      const { title, html } = await upload.json();

      setPhase("creating");
      // Loaded on demand so the dashboard doesn't ship the converter until it's used.
      // generateJSON drops any markup the editor's extensions can't represent.
      const [{ generateJSON }, { editorExtensions }] = await Promise.all([
        import("@tiptap/html"),
        import("@/lib/editor-extensions"),
      ]);
      const content = generateJSON(html, editorExtensions);

      const created = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!created.ok) {
        throw new Error(
          created.status === 413
            ? "The imported document is too large (max ~1 MB of content)"
            : await apiError(created, "Could not create the document"),
        );
      }
      const { id } = await created.json();
      router.push(`/documents/${id}`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Try again.");
      setPhase("idle");
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again after an error
    if (file) void importFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !busy) void importFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex flex-wrap items-center justify-between gap-3 rounded border-2 border-dashed px-4 py-3 ${
        dragging ? "border-blue-500 bg-blue-50" : "bg-white"
      }`}
    >
      <div className="text-sm">
        <p className="font-medium">
          {phase === "uploading" && "Uploading…"}
          {phase === "creating" && "Creating document…"}
          {phase === "idle" && "Drop a file here to create a new document from it"}
        </p>
        <p className="text-xs text-gray-500">Supported: .txt, .md, .docx — up to 2 MB</p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMPORT_EXTENSIONS.join(",")}
        onChange={onPick}
        className="hidden"
        aria-label="Choose a file to import"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="rounded border bg-white px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-60"
      >
        Import file
      </button>
    </div>
  );
}
