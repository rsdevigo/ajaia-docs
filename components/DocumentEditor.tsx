"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit"; // v3 StarterKit already bundles Underline
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import ShareDialog from "./ShareDialog";
import Toolbar from "./Toolbar";
import { useAutosave, type SaveStatus } from "./useAutosave";

export type LoadedDocument = {
  id: string;
  title: string;
  content: object;
  ownerName: string;
  role: "owner" | "editor" | "viewer";
};

function StatusIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === "error") {
    return (
      <button onClick={onRetry} className="text-sm text-red-600 underline">
        Save failed – retry
      </button>
    );
  }
  // "unsaved" (waiting for the debounce) reads as "Saving…"; "Saved" only follows a successful response.
  return (
    <span aria-live="polite" className="text-sm text-gray-500">
      {status === "saved" ? "Saved" : "Saving…"}
    </span>
  );
}

export default function DocumentEditor({ doc }: { doc: LoadedDocument }) {
  const router = useRouter();
  const editable = doc.role !== "viewer";
  const { status, queue, save } = useAutosave(doc.id);

  const [title, setTitle] = useState(doc.title);
  const committedTitle = useRef(doc.title);

  const editor = useEditor({
    extensions: [StarterKit],
    content: doc.content,
    editable,
    immediatelyRender: false, // avoids SSR hydration mismatch in Next.js
    editorProps: { attributes: { class: "doc-editor", "aria-label": "Document content" } },
    onUpdate: ({ editor }) => queue({ content: editor.getJSON() }),
  });

  function commitTitle() {
    const next = title.trim();
    if (!next) {
      setTitle(committedTitle.current); // titles can't be empty; revert
      return;
    }
    setTitle(next);
    if (next !== committedTitle.current) {
      committedTitle.current = next;
      queue({ title: next }, true);
    }
  }

  async function goBack() {
    const ok = await save(); // flush pending changes first
    if (!ok && !window.confirm("Your latest changes could not be saved. Leave anyway?")) return;
    router.push("/");
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-6">
      <div className="flex items-center justify-between">
        <button onClick={goBack} className="text-sm text-blue-700 hover:underline">
          ← Documents
        </button>
        <div className="flex items-center gap-3">
          {doc.role !== "owner" && (
            <span className="text-sm text-gray-600 capitalize">
              Shared by {doc.ownerName} · {doc.role}
            </span>
          )}
          {!editable && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              View only
            </span>
          )}
          {editable && <StatusIndicator status={status} onRetry={() => void save()} />}
          {doc.role === "owner" && <ShareDialog documentId={doc.id} />}
        </div>
      </div>

      {editable && editor && <Toolbar editor={editor} />}

      <div className="min-h-[70vh] rounded border bg-white px-12 py-10 shadow-sm">
        {editable ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            maxLength={200}
            aria-label="Document title"
            className="mb-6 w-full border-b border-transparent text-3xl font-semibold outline-none hover:border-gray-200 focus:border-blue-400"
          />
        ) : (
          <h1 className="mb-6 text-3xl font-semibold">{doc.title}</h1>
        )}
        <EditorContent editor={editor} />
      </div>
    </main>
  );
}
