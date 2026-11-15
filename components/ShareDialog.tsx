"use client";

import { useCallback, useEffect, useState } from "react";

type Role = "viewer" | "editor";
type Share = { userId: string; name: string; email: string; role: Role };

async function readError(res: Response) {
  const data = await res.json().catch(() => null);
  return data?.error ?? "Something went wrong. Try again.";
}

export default function ShareDialog({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<Share[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const base = `/api/documents/${documentId}/shares`;

  const loadShares = useCallback(async () => {
    try {
      const res = await fetch(base);
      if (!res.ok) return setError(await readError(res));
      setShares((await res.json()).shares);
    } catch {
      setError("Network error. Try again.");
    }
  }, [base]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    void loadShares();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loadShares]);

  /** Runs a request, shows the API's error inline on failure, refreshes the list on success. */
  async function run(request: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    try {
      const res = await request();
      if (!res.ok) {
        setError(await readError(res));
        return false;
      }
      await loadShares();
      return true;
    } catch {
      setError("Network error. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(() =>
      fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      }),
    );
    if (ok) setEmail("");
  }

  const changeRole = (userId: string, next: Role) =>
    run(() =>
      fetch(`${base}/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      }),
    );

  const remove = (userId: string) => run(() => fetch(`${base}/${userId}`, { method: "DELETE" }));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded border bg-white px-3 py-1 text-sm hover:bg-gray-100"
      >
        Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Share document"
            className="w-full max-w-md space-y-4 rounded-lg bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Share document</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-gray-500">
                ✕
              </button>
            </div>

            <form onSubmit={add} className="flex gap-2">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                aria-label="Email address"
                className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                aria-label="Role"
                className="rounded border px-2 text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                type="submit"
                disabled={busy}
                className="rounded bg-blue-600 px-3 text-sm text-white disabled:opacity-60"
              >
                Share
              </button>
            </form>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-700">People with access</h3>
              {shares === null ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : shares.length === 0 ? (
                <p className="text-sm text-gray-500">Only you can see this document.</p>
              ) : (
                <ul className="space-y-2">
                  {shares.map((s) => (
                    <li key={s.userId} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="truncate text-xs text-gray-500">{s.email}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <select
                          value={s.role}
                          disabled={busy}
                          onChange={(e) => void changeRole(s.userId, e.target.value as Role)}
                          aria-label={`Role for ${s.name}`}
                          className="rounded border px-2 py-1"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button
                          disabled={busy}
                          onClick={() => void remove(s.userId)}
                          className="text-red-600 hover:underline disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
