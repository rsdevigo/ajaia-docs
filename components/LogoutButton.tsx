"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button onClick={logout} className="rounded border px-3 py-1 text-sm hover:bg-gray-100">
      Log out
    </button>
  );
}
