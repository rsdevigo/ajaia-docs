"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewDocumentButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/documents", { method: "POST" });
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      router.push(`/documents/${id}`);
    } catch {
      setError("Could not create the document. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-sm text-red-600">{error}</span>}
      <button
        onClick={create}
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "New document"}
      </button>
    </div>
  );
}
