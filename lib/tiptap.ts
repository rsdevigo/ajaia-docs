// Validation for stored Tiptap documents, in two stages:
// 1. a cheap shape check (whitelisted node/mark names, depth cap) so huge or hostile input
//    never reaches the second stage;
// 2. the editor's own schema (built from the shared extension list) must accept the structure,
//    so a document the editor can't load can't be stored via the API.
import { getSchema } from "@tiptap/core";
import { editorExtensions } from "./editor-extensions";

const schema = getSchema(editorExtensions);

const NODE_TYPES = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "hardBreak",
  "blockquote",
  "codeBlock",
  "horizontalRule",
]);
const MARK_TYPES = new Set(["bold", "italic", "underline", "strike", "code", "link"]);
const MAX_DEPTH = 32;

export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validNode(node: unknown, depth: number): boolean {
  if (!isObject(node) || depth > MAX_DEPTH) return false;
  if (typeof node.type !== "string" || !NODE_TYPES.has(node.type)) return false;

  if (node.type === "text") {
    if (typeof node.text !== "string") return false;
  } else if (node.text !== undefined) {
    return false;
  }

  if (node.attrs !== undefined && !isObject(node.attrs)) return false;

  if (node.marks !== undefined) {
    if (!Array.isArray(node.marks)) return false;
    for (const mark of node.marks) {
      if (!isObject(mark) || typeof mark.type !== "string" || !MARK_TYPES.has(mark.type)) {
        return false;
      }
    }
  }

  if (node.content !== undefined) {
    if (!Array.isArray(node.content)) return false;
    for (const child of node.content) if (!validNode(child, depth + 1)) return false;
  }
  return true;
}

function matchesEditorSchema(doc: unknown): boolean {
  try {
    schema.nodeFromJSON(doc).check();
    return true;
  } catch {
    return false;
  }
}

export function isTiptapDoc(value: unknown): boolean {
  return isObject(value) && value.type === "doc" && validNode(value, 0) && matchesEditorSchema(value);
}
