import LoginForm from "./LoginForm";

export default function LoginPage() {
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
