"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DocumentEditor, { type LoadedDocument } from "./DocumentEditor";

type State =
  | { kind: "loading" }
  | { kind: "ready"; doc: LoadedDocument }
  | { kind: "not-found" }
  | { kind: "error" };

/** Fetches the document, then hands it to the editor. Handles loading / 404 / failure states. */
export default function DocumentView({ id }: { id: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 404 || res.status === 403) {
        setState({ kind: "not-found" });
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setState({
        kind: "ready",
        doc: {
          id: data.id,
          title: data.title,
          content: data.content,
          ownerName: data.ownerName,
          role: data.role,
        },
      });
    } catch {
      setState({ kind: "error" });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === "ready") return <DocumentEditor doc={state.doc} />;

  return (
    <main className="mx-auto mt-24 max-w-md space-y-4 px-6 text-center">
      {state.kind === "loading" && <p className="text-gray-500">Loading document…</p>}
      {state.kind === "not-found" && (
        <>
          <h1 className="text-xl font-semibold">Document not found</h1>
          <p className="text-gray-600">
            It may have been deleted, or it hasn&apos;t been shared with you.
          </p>
          <Link href="/" className="text-blue-700 hover:underline">
            Back to your documents
          </Link>
        </>
      )}
      {state.kind === "error" && (
        <>
          <h1 className="text-xl font-semibold">Couldn&apos;t load the document</h1>
          <button onClick={() => void load()} className="text-blue-700 underline">
            Try again
          </button>
        </>
      )}
    </main>
  );
}
