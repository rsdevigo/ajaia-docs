import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  // Skip the form if already signed in. Checked against the DB (not just the cookie), so a
  // cookie for a deleted user shows the form instead of bouncing between / and /login.
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="mx-auto mt-24 max-w-sm space-y-6 rounded-lg border bg-white p-6">
      <h1 className="text-xl font-semibold">Sign in to Ajaia Docs</h1>
      <LoginForm />
      <div className="rounded bg-gray-100 p-3 text-xs text-gray-700">
        <p className="font-medium">Demo accounts (password: demo1234)</p>
        <ul className="mt-1 list-disc pl-4">
          <li>alice@ajaia.test</li>
          <li>bob@ajaia.test</li>
          <li>carol@ajaia.test</li>
        </ul>
      </div>
    </main>
  );
}
