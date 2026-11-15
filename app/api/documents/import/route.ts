import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handle, jsonError } from "@/lib/api";
import { ImportError, importToHtml } from "@/lib/import";
import { IMPORT_MAX_BYTES, detectKind, titleFromFilename } from "@/lib/import-rules";

const TOO_LARGE = "File is too large (max 2 MB)";
const MULTIPART_OVERHEAD = 100_000; // boundaries + headers around the file

/**
 * Converts an uploaded .txt / .md / .docx into sanitized HTML plus a title.
 * It does not create a document: the browser turns the HTML into Tiptap JSON
 * (needs a DOM) and then creates the document via POST /api/documents.
 */
async function importFile(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Authentication required", 401);

  // Reject obviously oversized uploads before buffering the body.
  if (Number(req.headers.get("content-length") ?? 0) > IMPORT_MAX_BYTES + MULTIPART_OVERHEAD) {
    return jsonError(TOO_LARGE, 413);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Upload the file as multipart form data", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("No file was uploaded", 400);
  if (file.size > IMPORT_MAX_BYTES) return jsonError(TOO_LARGE, 413);
  if (file.size === 0) return jsonError("The file is empty", 400);

  const kind = detectKind(file.name);
  if (!kind) return jsonError("Unsupported file type. Supported: .txt, .md, .docx", 415);

  try {
    const html = await importToHtml(kind, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ title: titleFromFilename(file.name), html });
  } catch (err) {
    if (err instanceof ImportError) return jsonError(err.message, 400);
    return jsonError("Could not import this file", 500); // never leak internals
  }
}

export const POST = handle(importFile);
