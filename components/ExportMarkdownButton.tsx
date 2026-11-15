"use client";

import type { Editor } from "@tiptap/react";
import { markdownFilename, tiptapToMarkdown } from "@/lib/markdown";

/** Downloads the current editor content (including unsaved edits) as "<title>.md". Available to anyone who can read the document. */
export default function ExportMarkdownButton({ editor, title }: { editor: Editor | null; title: string }) {
  function download() {
    if (!editor) return;
    const markdown = tiptapToMarkdown(editor.getJSON());
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = markdownFilename(title);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <button
      onClick={download}
      disabled={!editor}
      title="Underline has no Markdown equivalent and is exported as plain text"
      className="rounded border bg-white px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-60"
    >
      Export as Markdown
    </button>
  );
}
