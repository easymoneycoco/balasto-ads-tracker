"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type PorFuente = {
  label: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  landingViews: number;
  whatsappClicks: number;
  conversionRate: number | null;
  fechaMin: string | null;
  fechaMax: string | null;
  gastoTotal: number | null;
  cpcPorVisita: number | null;
  cpcPorClickWhatsapp: number | null;
};

type PorCampaña = {
  label: string;
  utmCampaign: string;
  landingViews: number;
  whatsappClicks: number;
  conversionRate: number | null;
  fechaMin: string | null;
  fechaMax: string | null;
  gastoTotal: number | null;
  cpcPorVisita: number | null;
  cpcPorClickWhatsapp: number | null;
};

type MetricsResponse = {
  totales: {
    landingViews: number;
    whatsappClicks: number;
    conversionRate: number | null;
    calendlyClicks: number;
  };
  porFuente: PorFuente[];
  porCampaña: PorCampaña[];
  serieDiaria: { fecha: string; landingViews: number; whatsappClicks: number }[];
};

function formatNumber(value: number): string {
  return value.toLocaleString("es-MX");
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

export default function DashboardPage() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadMetrics() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/metrics?${params.toString()}`);
      if (!res.ok) throw new Error("No se pudieron cargar las métricas");
      const json: MetricsResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const combos = useMemo(() => {
    if (!data) return [];
    return data.porFuente
      .filter((row): row is PorFuente & { utmSource: string; utmMedium: string } =>
        Boolean(row.utmSource && row.utmMedium)
      )
      .map((row) => ({ label: row.label, utmSource: row.utmSource, utmMedium: row.utmMedium }));
  }, [data]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Dashboard de tráfico</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/links" className="text-sm text-blue-400 hover:text-blue-300">
              Ver links por canal
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-400"
            >
              + Registrar gasto
            </button>
          </div>
        </header>

        <section className="flex flex-wrap items-end gap-4 rounded-lg bg-slate-900 p-4">
          <div>
            <label className="block text-sm text-slate-400">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 rounded bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 rounded bg-slate-800 px-3 py-2"
            />
          </div>
          <button
            onClick={loadMetrics}
            className="rounded bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500"
          >
            Filtrar
          </button>
          {(from || to) && (
            <button
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="rounded bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
            >
              Limpiar
            </button>
          )}
        </section>

        {error && <p className="text-red-400">{error}</p>}
        {loading && <p className="text-slate-400">Cargando…</p>}

        {data && !loading && (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <StatCard label="Vistas de landing" value={formatNumber(data.totales.landingViews)} />
              <StatCard label="Clicks a WhatsApp" value={formatNumber(data.totales.whatsappClicks)} />
              <StatCard label="Tasa de conversión" value={formatPercent(data.totales.conversionRate)} />
              <StatCard label="Clics a Calendly" value={formatNumber(data.totales.calendlyClicks)} />
            </section>

            <section className="overflow-x-auto rounded-lg bg-slate-900">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="px-4 py-3">Canal</th>
                    <th className="px-4 py-3">Rango de fechas</th>
                    <th className="px-4 py-3 text-right">Vistas</th>
                    <th className="px-4 py-3 text-right">Clicks WA</th>
                    <th className="px-4 py-3 text-right">Conversión</th>
                    <th className="px-4 py-3 text-right">Gasto</th>
                    <th className="px-4 py-3 text-right">CPC / visita</th>
                    <th className="px-4 py-3 text-right">CPC / click WA</th>
                  </tr>
                </thead>
                <tbody>
                  {data.porFuente.map((row) => (
                    <tr
                      key={`${row.utmSource}-${row.utmMedium}`}
                      className="border-b border-slate-800/60"
                    >
                      <td className="px-4 py-3">
                        {row.label ? (
                          <>
                            <div className="font-semibold">{row.label}</div>
                            <div className="text-xs text-slate-500">
                              {row.utmSource ?? "—"} / {row.utmMedium ?? "—"}
                            </div>
                          </>
                        ) : (
                          <div className="font-semibold text-slate-300">
                            {row.utmSource ?? "—"} / {row.utmMedium ?? "—"}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(row.fechaMin)} — {formatDate(row.fechaMax)}
                      </td>
                      <td className="px-4 py-3 text-right">{formatNumber(row.landingViews)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(row.whatsappClicks)}</td>
                      <td className="px-4 py-3 text-right">{formatPercent(row.conversionRate)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(row.gastoTotal)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(row.cpcPorVisita)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(row.cpcPorClickWhatsapp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="overflow-x-auto rounded-lg bg-slate-900">
              <h2 className="border-b border-slate-800 px-4 py-3 text-lg font-bold">
                Comparación de campañas Meta Ads
              </h2>
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="px-4 py-3">Campaña</th>
                    <th className="px-4 py-3">Rango de fechas</th>
                    <th className="px-4 py-3 text-right">Vistas</th>
                    <th className="px-4 py-3 text-right">Clicks WA</th>
                    <th className="px-4 py-3 text-right">Conversión</th>
                    <th className="px-4 py-3 text-right">Gasto</th>
                    <th className="px-4 py-3 text-right">CPC / visita</th>
                    <th className="px-4 py-3 text-right">CPC / click WA</th>
                  </tr>
                </thead>
                <tbody>
                  {data.porCampaña.map((row) => (
                    <tr key={row.utmCampaign} className="border-b border-slate-800/60">
                      <td className="px-4 py-3 font-semibold">{row.label}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(row.fechaMin)} — {formatDate(row.fechaMax)}
                      </td>
                      <td className="px-4 py-3 text-right">{formatNumber(row.landingViews)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(row.whatsappClicks)}</td>
                      <td className="px-4 py-3 text-right">{formatPercent(row.conversionRate)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(row.gastoTotal)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(row.cpcPorVisita)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(row.cpcPorClickWhatsapp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>

      {isModalOpen && (
        <SpendModal
          combos={combos}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            setIsModalOpen(false);
            loadMetrics();
          }}
        />
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function SpendModal({
  combos,
  onClose,
  onSaved,
}: {
  combos: { label: string | null; utmSource: string; utmMedium: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedCombo, setSelectedCombo] = useState(
    combos[0] ? `${combos[0].utmSource}|${combos[0].utmMedium}` : "__custom__"
  );
  const [customSource, setCustomSource] = useState("");
  const [customMedium, setCustomMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("MXN");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustom = selectedCombo === "__custom__";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const [utmSource, utmMedium] = isCustom
      ? [customSource, customMedium]
      : selectedCombo.split("|");

    if (!utmSource || !utmMedium || !amount || !dateFrom || !dateTo) {
      setError("Completa los campos requeridos.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utmSource,
          utmMedium,
          utmCampaign: utmCampaign || undefined,
          amount: Number(amount),
          currency,
          dateFrom,
          dateTo,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("No se pudo guardar el gasto");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-lg bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Registrar gasto</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400">Fuente + medio</label>
            <select
              value={selectedCombo}
              onChange={(e) => setSelectedCombo(e.target.value)}
              className="mt-1 w-full rounded bg-slate-800 px-3 py-2"
            >
              {combos.map((combo) => (
                <option
                  key={`${combo.utmSource}|${combo.utmMedium}`}
                  value={`${combo.utmSource}|${combo.utmMedium}`}
                >
                  {combo.label ?? `${combo.utmSource} / ${combo.utmMedium}`}
                </option>
              ))}
              <option value="__custom__">Otra combinación…</option>
            </select>
          </div>

          {isCustom && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400">utm_source</label>
                <input
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  className="mt-1 w-full rounded bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400">utm_medium</label>
                <input
                  value={customMedium}
                  onChange={(e) => setCustomMedium(e.target.value)}
                  className="mt-1 w-full rounded bg-slate-800 px-3 py-2"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400">Campaña (opcional)</label>
            <input
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              placeholder="internacional, nacional, combinados (opcional)"
              className="mt-1 w-full rounded bg-slate-800 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400">Monto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded bg-slate-800 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400">Moneda</label>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 w-full rounded bg-slate-800 px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 w-full rounded bg-slate-800 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 w-full rounded bg-slate-800 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded bg-slate-800 px-3 py-2"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-slate-400 hover:text-white">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-400 disabled:opacity-50"
            >
              {submitting ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
