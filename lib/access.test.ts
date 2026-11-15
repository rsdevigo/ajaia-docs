import { describe, expect, it } from "vitest";
import {
  canDelete,
  canEdit,
  canManageSharing,
  canRead,
  resolveAccess,
  type AccessLevel,
  type ShareRoleValue,
} from "./access";

describe("resolveAccess", () => {
  const cases: { name: string; userId: string; shareRole: ShareRoleValue | null; expected: AccessLevel | null }[] = [
    { name: "owner (no share row)", userId: "owner", shareRole: null, expected: "owner" },
    { name: "owner wins over a share row", userId: "owner", shareRole: "VIEWER", expected: "owner" },
    { name: "EDITOR share", userId: "other", shareRole: "EDITOR", expected: "editor" },
    { name: "VIEWER share", userId: "other", shareRole: "VIEWER", expected: "viewer" },
    { name: "not owner, no share", userId: "other", shareRole: null, expected: null },
  ];

  it.each(cases)("$name → $expected", ({ userId, shareRole, expected }) => {
    expect(resolveAccess({ userId, ownerId: "owner", shareRole })).toBe(expected);
  });
});

describe("permission matrix", () => {
  // access level      read   edit   manageSharing  delete
  const matrix: [AccessLevel | null, boolean, boolean, boolean, boolean][] = [
    ["owner", true, true, true, true],
    ["editor", true, true, false, false],
    ["viewer", true, false, false, false],
    [null, false, false, false, false],
  ];

  it.each(matrix)("%s", (level, read, edit, manage, del) => {
    expect(canRead(level)).toBe(read);
    expect(canEdit(level)).toBe(edit);
    expect(canManageSharing(level)).toBe(manage);
    expect(canDelete(level)).toBe(del);
  });
});
