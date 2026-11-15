import { z } from "zod";
import type { ShareRole } from "@prisma/client";

export const roleSchema = z.enum(["viewer", "editor"], {
  message: "Role must be viewer or editor",
});
export type ShareRoleName = z.infer<typeof roleSchema>;

export const toDbRole = (role: ShareRoleName): ShareRole =>
  role === "editor" ? "EDITOR" : "VIEWER";

export const shareSelect = {
  role: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

export function toShareDto(share: {
  role: ShareRole;
  user: { id: string; name: string; email: string };
}) {
  return {
    userId: share.user.id,
    name: share.user.name,
    email: share.user.email,
    role: share.role === "EDITOR" ? "editor" : "viewer",
  };
}
