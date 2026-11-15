import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canManageSharing } from "@/lib/access";
import { authorizeDocument, handle, jsonError } from "@/lib/api";
import { roleSchema, shareSelect, toDbRole, toShareDto } from "@/lib/shares";

const addSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: roleSchema,
});

type Ctx = { params: Promise<{ id: string }> };

async function listShares(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await authorizeDocument(id, canManageSharing);
  if (!auth.ok) return auth.res;

  const shares = await db.documentShare.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "asc" },
    select: shareSelect,
  });
  return NextResponse.json({ shares: shares.map(toShareDto) });
}

/** Share with a user by email. Sharing again with the same user updates their role. */
async function addShare(req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await authorizeDocument(id, canManageSharing);
  if (!auth.ok) return auth.res;

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }
  const { email, role } = parsed.data;

  const target = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!target) return jsonError("No user with that email", 404);
  if (target.id === auth.user.id) {
    return jsonError("You already own this document", 400);
  }

  const share = await db.documentShare.upsert({
    where: { documentId_userId: { documentId: id, userId: target.id } },
    update: { role: toDbRole(role) },
    create: { documentId: id, userId: target.id, role: toDbRole(role) },
    select: shareSelect,
  });
  return NextResponse.json({ share: toShareDto(share) });
}

export const GET = handle(listShares);
export const POST = handle(addShare);
