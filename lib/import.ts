import mammoth from "mammoth";
import { marked } from "marked";
import type { ImportKind } from "./import-rules";
import sanitizeHtml from "sanitize-html";

/*
 * File import: pure functions that turn uploaded file contents into sanitized HTML.
 * HTML -> Tiptap JSON happens client-side (it needs a DOM), see components/ImportFile.tsx.
 *
 * Deliberate scope choice: the original uploaded file is NOT stored (no blob storage).
 * Import is a one-way conversion into a new editable document; only the converted
 * content is kept.
 */

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain text -> one <p> per blank-line-separated block; single newlines become <br>. */
export function txtToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// ---- Markdown ----

/**
 * Allow-list of what the editor can represent. Anything else (scripts, styles, images,
 * iframes, event handlers, ...) is removed; text inside removed tags is kept.
 * The client's generateJSON drops whatever the editor can't hold as a second line of defense.
 */
export function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "strike",
      "code", "pre", "blockquote", "hr", "ul", "ol", "li", "a",
    ],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    // Table cells become paragraphs so their text doesn't run together once the table is dropped.
    transformTags: { td: "p", th: "p" },
  });
}

export function mdToHtml(markdown: string): string {
  return sanitize(marked.parse(markdown, { async: false }));
}

// ---- Word (.docx) ----

/**
 * Word -> HTML via mammoth (headings, bold, italic, underline, lists), then sanitized.
 * Throws if the buffer is not a readable .docx; callers turn that into a 400.
 */
export async function docxToHtml(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.convertToHtml({ buffer }, { styleMap: ["u => u"] });
  return sanitize(value);
}

// ---- Entry point used by the API route ----

/** A problem with the uploaded file's content; the message is safe to show to the user. */
export class ImportError extends Error {}

function decodeText(buffer: Buffer): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new ImportError("This file isn't valid UTF-8 text");
  }
  if (text.includes("\0")) throw new ImportError("This looks like a binary file, not text");
  return text.replace(/^﻿/, ""); // drop byte-order mark
}

/** Validates the content for the given kind and converts it to sanitized HTML. */
export async function importToHtml(kind: ImportKind, buffer: Buffer): Promise<string> {
  let html: string;
  if (kind === "docx") {
    // .docx is a zip archive: check the magic bytes before handing it to mammoth.
    if (buffer.subarray(0, 4).toString("hex") !== "504b0304") {
      throw new ImportError("This file is not a valid .docx document");
    }
    try {
      html = await docxToHtml(buffer);
    } catch {
      throw new ImportError("This .docx file could not be read. It may be corrupted");
    }
  } else {
    const text = decodeText(buffer);
    html = kind === "txt" ? txtToHtml(text) : mdToHtml(text);
  }
  if (!html.replace(/<[^>]*>/g, "").trim()) {
    throw new ImportError("No readable text was found in this file");
  }
  return html;
}
