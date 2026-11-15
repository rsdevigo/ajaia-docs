import { db } from "./db";

/*
 * The single place that decides who may do what with a document.
 * Every document API route goes through getDocumentAccess + a can* helper.
 */

export type AccessLevel = "owner" | "editor" | "viewer";
export type ShareRoleValue = "VIEWER" | "EDITOR";

/** Pure decision logic (no DB), so it can be unit-tested directly. */
export function resolveAccess(input: {
  userId: string;
  ownerId: string;
  shareRole: ShareRoleValue | null;
}): AccessLevel | null {
  if (input.userId === input.ownerId) return "owner";
  if (input.shareRole === "EDITOR") return "editor";
  if (input.shareRole === "VIEWER") return "viewer";
  return null;
}

/** Null means "missing or no access"; callers treat both as 404 so existence isn't leaked. */
export async function getDocumentAccess(
  userId: string,
  documentId: string,
): Promise<AccessLevel | null> {
  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: {
      ownerId: true,
      shares: { where: { userId }, select: { role: true } },
    },
  });
  if (!doc) return null;
  return resolveAccess({ userId, ownerId: doc.ownerId, shareRole: doc.shares[0]?.role ?? null });
}

export const canRead = (a: AccessLevel | null) => a !== null;
export const canEdit = (a: AccessLevel | null) => a === "owner" || a === "editor";
export const canManageSharing = (a: AccessLevel | null) => a === "owner";
export const canDelete = (a: AccessLevel | null) => a === "owner";
