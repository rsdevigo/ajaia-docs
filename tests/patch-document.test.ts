import { beforeEach, describe, expect, it, vi } from "vitest";

// Route-level test: the real PATCH handler + real lib/access.ts + real validation,
// with only the session lookup and Prisma mocked.
const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({
  db: { document: { findUnique: mocks.findUnique, update: mocks.update } },
}));

import { PATCH } from "@/app/api/documents/[id]/route";

const ctx = { params: Promise.resolve({ id: "doc1" }) };
const patch = (body: unknown) =>
  PATCH(
    new Request("http://localhost/api/documents/doc1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx,
  );

/** The document row as getDocumentAccess reads it: owner id + this user's share (if any). */
const docWithShare = (role: "VIEWER" | "EDITOR" | null) => ({
  ownerId: "owner-id",
  shares: role ? [{ role }] : [],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "u@x.test", name: "U" });
  mocks.update.mockResolvedValue({ updatedAt: new Date("2026-01-01T00:00:00Z") });
});

describe("PATCH /api/documents/[id]", () => {
  it("viewer → 403 and nothing is written", async () => {
    mocks.findUnique.mockResolvedValue(docWithShare("VIEWER"));
    const res = await patch({ title: "Hacked" });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: expect.any(String) });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("editor → 200 and the title is saved", async () => {
    mocks.findUnique.mockResolvedValue(docWithShare("EDITOR"));
    const res = await patch({ title: "New title" });
    expect(res.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "doc1" }, data: expect.objectContaining({ title: "New title" }) }),
    );
  });

  it("user with no access → 404 (existence is not leaked)", async () => {
    mocks.findUnique.mockResolvedValue(docWithShare(null));
    expect((await patch({ title: "x" })).status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("signed-out request → 401", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await patch({ title: "x" })).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("unexpected failure (DB down) → JSON 500 that leaks nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findUnique.mockRejectedValue(new Error("connect ECONNREFUSED db.internal:5432 password=hunter2"));
    const res = await patch({ title: "x" });
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: expect.any(String) });
    expect(text).not.toMatch(/ECONNREFUSED|hunter2|db\.internal|at /);
  });

  it("owner sending invalid content → 400 with { error }", async () => {
    mocks.findUnique.mockResolvedValue({ ownerId: "user-1", shares: [] });
    const res = await patch({ content: { type: "doc", content: [{ type: "script" }] } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid document content" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
