"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CHANNELS } from "@/lib/channels";

export default function LinksPage() {
  const [origin, setOrigin] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin);
  }, []);

  async function handleCopy(url: string, key: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2000);
    } catch {
      // Clipboard permission denied or unavailable; nothing to recover.
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Links por canal</h1>
          <Link href="/dashboard" className="text-sm text-blue-400 hover:text-blue-300">
            ← Volver al dashboard
          </Link>
        </div>

        <p className="text-sm text-slate-400">
          Copia el link correspondiente a cada canal y úsalo tal cual al publicar o pautar.
        </p>

        <div className="overflow-x-auto rounded-lg bg-slate-900">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Link</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {CHANNELS.map((channel) => {
                const key = `${channel.utmSource}-${channel.utmMedium}`;
                const url = origin
                  ? `${origin}/?utm_source=${channel.utmSource}&utm_medium=${channel.utmMedium}`
                  : null;

                return (
                  <tr key={key} className="border-b border-slate-800/60">
                    <td className="px-4 py-3 font-medium">{channel.label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {url ?? "Cargando…"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => url && handleCopy(url, key)}
                        disabled={!url}
                        className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500 disabled:opacity-50"
                      >
                        {copiedKey === key ? "¡Copiado!" : "Copiar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
