"use client";

import { useState } from "react";
import { loginAdmin } from "@/app/admin/actions";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await loginAdmin(password);
    if (res.success) {
      router.refresh();
    } else {
      setError(res.error || "Errore sconosciuto");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7] p-4 text-[#0A192F]">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-4xl">Rena Bianca</h1>
          <p className="mt-2 text-sm text-gray-500">Pannello di Amministrazione</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Inserisci la password"
              required
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md border border-transparent bg-[#0A192F] py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>

        <div className="mt-8 border-t border-gray-200 pt-6 text-xs text-gray-500">
          <p className="font-semibold">Istruzioni Vercel:</p>
          <p className="mt-1">
            Per impostare la password, vai sulla dashboard di Vercel:
            <br />
            Settings {"->"} Environment Variables
            <br />
            Aggiungi una nuova variabile:
            <br />
            <code className="rounded bg-gray-100 px-1 font-mono">ADMIN_PASSWORD</code> = la tua password
          </p>
        </div>
      </div>
    </div>
  );
}
