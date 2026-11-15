import { cookies } from "next/headers";
import { db } from "./db";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/*
 * Deliberate scope cuts: no registration, no OAuth, no password reset.
 * Users are seeded (see prisma/seed.ts); this is just enough auth to make
 * per-user document access and sharing meaningful.
 */

export type CurrentUser = { id: string; email: string; name: string };

/** The logged-in user, or null. Re-checks the DB so deleted users lose access. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const userId = await verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
}
