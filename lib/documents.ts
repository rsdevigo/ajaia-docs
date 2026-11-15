import { db } from "./db";

export type DocumentListItem = {
  id: string;
  title: string;
  updatedAt: Date;
  ownerName: string;
  role: "owner" | "editor" | "viewer";
};

/**
 * Lists are scoped by query (ownerId / share row for this user), so they can't
 * include a document the user has no access to. Single-document reads and
 * writes go through lib/access.ts.
 */
export async function listDocumentsForUser(userId: string) {
  const [owned, shares] = await Promise.all([
    db.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, owner: { select: { name: true } } },
    }),
    db.documentShare.findMany({
      where: { userId },
      orderBy: { document: { updatedAt: "desc" } },
      select: {
        role: true,
        document: {
          select: { id: true, title: true, updatedAt: true, owner: { select: { name: true } } },
        },
      },
    }),
  ]);

  return {
    owned: owned.map(
      (d): DocumentListItem => ({
        id: d.id,
        title: d.title,
        updatedAt: d.updatedAt,
        ownerName: d.owner.name,
        role: "owner",
      }),
    ),
    sharedWithMe: shares.map(
      (s): DocumentListItem => ({
        id: s.document.id,
        title: s.document.title,
        updatedAt: s.document.updatedAt,
        ownerName: s.document.owner.name,
        role: s.role === "EDITOR" ? "editor" : "viewer",
      }),
    ),
  };
}
