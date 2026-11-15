import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { canDelete, canEdit, canRead } from "@/lib/access";
import { authorizeDocument, jsonError } from "@/lib/api";
import { isTiptapDoc } from "@/lib/tiptap";

/*
 * Known limitation: concurrent edits are last-write-wins. If two people edit the
 * same document, the most recent PATCH overwrites the other's content. Real-time
 * collaboration / conflict resolution is a deliberate scope cut.
 */

const MAX_BODY_BYTES = 1_000_000; // ~1 MB

const patchSchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").max(200, "Title is too long").optional(),
    content: z.custom<Record<string, unknown>>(isTiptapDoc, "Invalid document content").optional(),
  })
  .strict()
  .refine((v) => v.title !== undefined || v.content !== undefined, "Nothing to update");

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await authorizeDocument(id, canRead);
  if (!auth.ok) return auth.res;

  const doc = await db.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
      owner: { select: { name: true } },
    },
  });
  if (!doc) return jsonError("Document not found", 404); // deleted between the two queries

  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    content: doc.content,
    updatedAt: doc.updatedAt,
    ownerName: doc.owner.name,
    role: auth.access,
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await authorizeDocument(id, canEdit);
  if (!auth.ok) return auth.res;

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return jsonError("Document is too large (max ~1 MB)", 413);

  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
    return jsonError("Document is too large (max ~1 MB)", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  const { title, content } = parsed.data;
  const updated = await db.document.update({
    where: { id },
    data: { title, content: content as Prisma.InputJsonValue | undefined },
    select: { updatedAt: true },
  });
  return NextResponse.json({ updatedAt: updated.updatedAt });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await authorizeDocument(id, canDelete);
  if (!auth.ok) return auth.res;

  await db.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
