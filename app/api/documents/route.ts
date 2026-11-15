import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { listDocumentsForUser } from "@/lib/documents";
import { EMPTY_DOC } from "@/lib/tiptap";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Authentication required", 401);
  return NextResponse.json(await listDocumentsForUser(user.id));
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Authentication required", 401);

  const doc = await db.document.create({
    data: { content: EMPTY_DOC, ownerId: user.id },
    select: { id: true },
  });
  return NextResponse.json({ id: doc.id }, { status: 201 });
}
