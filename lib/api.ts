import { NextResponse } from "next/server";
import { getCurrentUser, type CurrentUser } from "./auth";
import { getDocumentAccess, type AccessLevel } from "./access";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export const MAX_JSON_BYTES = 1_000_000; // ~1 MB

type JsonBody = { ok: true; body: unknown } | { ok: false; res: NextResponse };

/**
 * Reads a JSON request body with a size cap (413) and JSON syntax check (400).
 * With allowEmpty, a missing body yields `undefined` instead of an error.
 */
export async function readJsonBody(
  req: Request,
  opts: { allowEmpty?: boolean } = {},
): Promise<JsonBody> {
  const tooLarge = () => ({
    ok: false as const,
    res: jsonError("Document is too large (max ~1 MB)", 413),
  });

  if (Number(req.headers.get("content-length") ?? 0) > MAX_JSON_BYTES) return tooLarge();
  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_JSON_BYTES) return tooLarge();

  if (raw.trim() === "" && opts.allowEmpty) return { ok: true, body: undefined };
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, res: jsonError("Request body must be valid JSON", 400) };
  }
}

type Authorized =
  | { ok: true; user: CurrentUser; access: AccessLevel }
  | { ok: false; res: NextResponse };

/**
 * Shared guard for every /api/documents/[id] route:
 * 401 if not signed in, 404 if the doc is missing or not visible to the user,
 * 403 if the user can see it but lacks the required permission.
 */
export async function authorizeDocument(
  documentId: string,
  allowed: (access: AccessLevel | null) => boolean,
): Promise<Authorized> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, res: jsonError("Authentication required", 401) };

  const access = await getDocumentAccess(user.id, documentId);
  if (access === null) return { ok: false, res: jsonError("Document not found", 404) };
  if (!allowed(access)) {
    return { ok: false, res: jsonError("You don't have permission to do that", 403) };
  }
  return { ok: true, user, access };
}

/**
 * Wraps a route handler so an unexpected error (DB down, bug) becomes a JSON
 * `{ error }` 500 instead of a framework error page. Details are logged server-side
 * only; nothing about the error is sent to the client.
 */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error("Unhandled API error:", err);
      return jsonError("Something went wrong. Please try again.", 500);
    }
  };
}
