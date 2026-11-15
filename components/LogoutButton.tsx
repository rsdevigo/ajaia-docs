"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [failed, setFailed] = useState(false);

  async function logout() {
    setFailed(false);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error();
      window.location.href = "/login";
    } catch {
      setFailed(true); // still signed in; say so instead of silently doing nothing
    }
  }

  return (
    <>
      {failed && <span className="text-xs text-red-600">Could not log out. Try again.</span>}
      <button onClick={logout} className="rounded border px-3 py-1 text-sm hover:bg-gray-100">
        Log out
      </button>
    </>
  );
}
