"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";
type Patch = { title?: string; content?: object };

const DEBOUNCE_MS = 800;
const KEEPALIVE_MAX_CHARS = 60_000;
const hasChanges = (p: Patch) => p.title !== undefined || p.content !== undefined;

/**
 * Debounced autosave for one document.
 * - "saved" is only ever set after a successful response.
 * - On failure the unsaved patch is kept (newer edits win on merge) so retry loses nothing.
 * - Saves are single-flight: a new save waits for the one in progress.
 * Last-write-wins: no conflict detection against other editors.
 */
export function useAutosave(documentId: string) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef<Promise<boolean> | null>(null);

  const send = useCallback(
    async (patch: Patch, keepalive: boolean) => {
      try {
        const body = JSON.stringify(patch);
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
          // keepalive lets the request outlive the page; browsers cap its body at 64 KB.
          keepalive: keepalive && body.length < KEEPALIVE_MAX_CHARS,
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [documentId],
  );

  /** Resolves true if everything pending has been saved (or nothing was pending). */
  const save = useCallback(async (opts?: { keepalive?: boolean }): Promise<boolean> => {
    clearTimeout(timer.current);
    while (inFlight.current) await inFlight.current;

    const patch = pending.current;
    if (!hasChanges(patch)) return true;
    pending.current = {};
    setStatus("saving");

    const request = send(patch, opts?.keepalive ?? false);
    inFlight.current = request;
    const ok = await request;
    inFlight.current = null;

    if (ok) {
      setStatus(hasChanges(pending.current) ? "unsaved" : "saved");
    } else {
      pending.current = { ...patch, ...pending.current };
      setStatus("error");
    }
    return ok;
  }, [send]);

  /** Record a change; it is saved after the debounce (or right away if immediate). */
  const queue = useCallback(
    (patch: Patch, immediate = false) => {
      pending.current = { ...pending.current, ...patch };
      setStatus("unsaved");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), immediate ? 0 : DEBOUNCE_MS);
    },
    [save],
  );

  // Warn before closing/reloading the tab with unsaved changes.
  useEffect(() => {
    if (status === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  // Leaving the page (browser back, tab close, reload): flush whatever is pending,
  // with keepalive so the request isn't cancelled by the navigation.
  useEffect(() => {
    const flush = () => {
      if (hasChanges(pending.current)) void save({ keepalive: true });
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush(); // component unmount = in-app navigation
    };
  }, [save]);

  return { status, queue, save };
}
