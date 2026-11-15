import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canManageSharing } from "@/lib/access";
import { authorizeDocument, handle, jsonError } from "@/lib/api";
import { roleSchema, toDbRole } from "@/lib/shares";

const patchSchema = z.object({ role: roleSchema });

type Ctx = { params: Promise<{ id: string; userId: string }> };

async function changeShareRole(req: Request, { params }: Ctx) {
  const { id, userId } = await params;
  const auth = await authorizeDocument(id, canManageSharing);
  if (!auth.ok) return auth.res;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  const { count } = await db.documentShare.updateMany({
    where: { documentId: id, userId },
    data: { role: toDbRole(parsed.data.role) },
  });
  if (count === 0) return jsonError("That user doesn't have access to this document", 404);
  return NextResponse.json({ userId, role: parsed.data.role });
}

async function removeShare(_req: Request, { params }: Ctx) {
  const { id, userId } = await params;
  const auth = await authorizeDocument(id, canManageSharing);
  if (!auth.ok) return auth.res;

  const { count } = await db.documentShare.deleteMany({ where: { documentId: id, userId } });
  if (count === 0) return jsonError("That user doesn't have access to this document", 404);
  return NextResponse.json({ ok: true });
}

export const PATCH = handle(changeShareRole);
export const DELETE = handle(removeShare);
