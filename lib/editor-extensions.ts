import StarterKit from "@tiptap/starter-kit";

// Single source of truth for what documents can contain. Used by the editor and by the
// client-side import (generateJSON), so markup the editor can't represent is dropped on import.
// Tiptap v3's StarterKit already bundles Underline.
export const editorExtensions = [StarterKit];
