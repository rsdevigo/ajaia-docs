import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { handle, jsonError, readJsonBody } from "@/lib/api";
import { listDocumentsForUser } from "@/lib/documents";
import { EMPTY_DOC, isTiptapDoc } from "@/lib/tiptap";

// Optional body: used by file import to create a document with initial title/content.
const createSchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").max(200, "Title is too long").optional(),
    content: z.custom<Record<string, unknown>>(isTiptapDoc, "Invalid document content").optional(),
  })
  .strict();

async function listDocuments() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Authentication required", 401);
  return NextResponse.json(await listDocumentsForUser(user.id));
}

async function createDocument(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Authentication required", 401);

  const read = await readJsonBody(req, { allowEmpty: true });
  if (!read.ok) return read.res;
  const parsed = createSchema.safeParse(read.body ?? {});
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  const doc = await db.document.create({
    data: {
      title: parsed.data.title,
      content: (parsed.data.content ?? EMPTY_DOC) as Prisma.InputJsonValue,
      ownerId: user.id,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: doc.id }, { status: 201 });
}

export const GET = handle(listDocuments);
export const POST = handle(createDocument);
