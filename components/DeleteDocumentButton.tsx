"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Two-step delete: first click asks for confirmation, second click deletes. */
export default function DeleteDocumentButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Could not delete. Try again.");
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${title}`}
        className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      {error ? <span className="text-red-600">{error}</span> : <span>Delete permanently?</span>}
      <button
        onClick={remove}
        disabled={pending}
        className="rounded bg-red-600 px-2 py-1 text-white disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button onClick={() => setConfirming(false)} disabled={pending} className="px-2 py-1">
        Cancel
      </button>
    </span>
  );
}
