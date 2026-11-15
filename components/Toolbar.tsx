"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";

type Item = {
  label: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  run: () => void;
};

export default function Toolbar({ editor }: { editor: Editor }) {
  // Tiptap v3 doesn't re-render on every transaction, so subscribe to just what we show.
  const s = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      h1: editor.isActive("heading", { level: 1 }),
      h2: editor.isActive("heading", { level: 2 }),
      paragraph: editor.isActive("paragraph"),
      bullet: editor.isActive("bulletList"),
      ordered: editor.isActive("orderedList"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();
  const items: (Item | "sep")[] = [
    { label: "B", title: "Bold (Ctrl+B)", active: s.bold, run: () => chain().toggleBold().run() },
    { label: "I", title: "Italic (Ctrl+I)", active: s.italic, run: () => chain().toggleItalic().run() },
    { label: "U", title: "Underline (Ctrl+U)", active: s.underline, run: () => chain().toggleUnderline().run() },
    "sep",
    { label: "H1", title: "Heading 1 (Ctrl+Alt+1)", active: s.h1, run: () => chain().toggleHeading({ level: 1 }).run() },
    { label: "H2", title: "Heading 2 (Ctrl+Alt+2)", active: s.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
    { label: "¶", title: "Paragraph (Ctrl+Alt+0)", active: s.paragraph, run: () => chain().setParagraph().run() },
    "sep",
    { label: "• List", title: "Bullet list (Ctrl+Shift+8)", active: s.bullet, run: () => chain().toggleBulletList().run() },
    { label: "1. List", title: "Numbered list (Ctrl+Shift+7)", active: s.ordered, run: () => chain().toggleOrderedList().run() },
    "sep",
    { label: "Undo", title: "Undo (Ctrl+Z)", disabled: !s.canUndo, run: () => chain().undo().run() },
    { label: "Redo", title: "Redo (Ctrl+Shift+Z)", disabled: !s.canRedo, run: () => chain().redo().run() },
  ];

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1 rounded border bg-white p-1">
      {items.map((item, i) =>
        item === "sep" ? (
          <span key={i} className="mx-1 h-5 w-px bg-gray-300" />
        ) : (
          <button
            key={item.label}
            type="button"
            title={item.title}
            aria-pressed={item.active}
            disabled={item.disabled}
            // Keep the editor selection when clicking toolbar buttons.
            onMouseDown={(e) => e.preventDefault()}
            onClick={item.run}
            className={`rounded px-2 py-1 text-sm disabled:opacity-40 ${
              item.active ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
            }`}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
