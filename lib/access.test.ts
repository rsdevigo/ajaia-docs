import { describe, expect, it } from "vitest";
import { canDelete, canEdit, canManageSharing, canRead, resolveAccess } from "./access";

const base = { userId: "u1", ownerId: "owner", shareRole: null } as const;

describe("resolveAccess", () => {
  it("gives the owner owner access, even without a share row", () => {
    expect(resolveAccess({ ...base, userId: "owner" })).toBe("owner");
  });

  it("maps share roles to editor / viewer", () => {
    expect(resolveAccess({ ...base, shareRole: "EDITOR" })).toBe("editor");
    expect(resolveAccess({ ...base, shareRole: "VIEWER" })).toBe("viewer");
  });

  it("denies users with no ownership and no share", () => {
    expect(resolveAccess(base)).toBeNull();
  });
});

describe("permission helpers", () => {
  it("canRead: any access level, never null", () => {
    expect(["owner", "editor", "viewer"].every((a) => canRead(a as never))).toBe(true);
    expect(canRead(null)).toBe(false);
  });

  it("canEdit: owner and editor only", () => {
    expect(canEdit("owner")).toBe(true);
    expect(canEdit("editor")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
    expect(canEdit(null)).toBe(false);
  });

  it("canManageSharing / canDelete: owner only", () => {
    for (const fn of [canManageSharing, canDelete]) {
      expect(fn("owner")).toBe(true);
      expect(fn("editor")).toBe(false);
      expect(fn("viewer")).toBe(false);
      expect(fn(null)).toBe(false);
    }
  });
});
