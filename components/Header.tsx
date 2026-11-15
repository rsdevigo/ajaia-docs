import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function Header() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <span className="font-semibold">Ajaia Docs</span>
      <div className="flex items-center gap-3 text-sm">
        <span>{user.name}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
