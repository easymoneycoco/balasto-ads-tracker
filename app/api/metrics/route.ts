import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

function parseDate(value: string | null): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));

    const totalesResult = await pool.query<{ event_name: string; count: string }>(
      `SELECT event_name, COUNT(*)::text AS count
       FROM analytics_events
       WHERE event_name IN ('landing_view', 'whatsapp_click')
         AND ($1::date IS NULL OR created_at >= $1::date)
         AND ($2::date IS NULL OR created_at < ($2::date + INTERVAL '1 day'))
       GROUP BY event_name`,
      [from, to]
    );

    let landingViews = 0;
    let whatsappClicks = 0;
    for (const row of totalesResult.rows) {
      if (row.event_name === "landing_view") landingViews = Number(row.count);
      if (row.event_name === "whatsapp_click") whatsappClicks = Number(row.count);
    }
    const conversionRate = landingViews > 0 ? whatsappClicks / landingViews : null;

    const porFuenteResult = await pool.query<{
      utm_source: string | null;
      utm_medium: string | null;
      landing_views: string;
      whatsapp_clicks: string;
      fecha_min: string;
      fecha_max: string;
    }>(
      `SELECT
         utm_source,
         utm_medium,
         COUNT(*) FILTER (WHERE event_name = 'landing_view')::text AS landing_views,
         COUNT(*) FILTER (WHERE event_name = 'whatsapp_click')::text AS whatsapp_clicks,
         MIN(created_at) AS fecha_min,
         MAX(created_at) AS fecha_max
       FROM analytics_events
       WHERE event_name IN ('landing_view', 'whatsapp_click')
         AND ($1::date IS NULL OR created_at >= $1::date)
         AND ($2::date IS NULL OR created_at < ($2::date + INTERVAL '1 day'))
       GROUP BY utm_source, utm_medium
       ORDER BY utm_source, utm_medium`,
      [from, to]
    );

    const spendResult = await pool.query<{
      utm_source: string;
      utm_medium: string;
      total: string;
    }>(
      `SELECT utm_source, utm_medium, SUM(amount)::text AS total
       FROM ad_spend
       WHERE ($1::date IS NULL OR date_to >= $1::date)
         AND ($2::date IS NULL OR date_from <= $2::date)
       GROUP BY utm_source, utm_medium`,
      [from, to]
    );

    const spendMap = new Map<string, number>();
    for (const row of spendResult.rows) {
      spendMap.set(`${row.utm_source}|${row.utm_medium}`, Number(row.total));
    }

    const porFuente = porFuenteResult.rows.map((row) => {
      const views = Number(row.landing_views);
      const clicks = Number(row.whatsapp_clicks);
      const gastoTotal =
        row.utm_source && row.utm_medium
          ? spendMap.get(`${row.utm_source}|${row.utm_medium}`) ?? null
          : null;

      return {
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        landingViews: views,
        whatsappClicks: clicks,
        conversionRate: views > 0 ? clicks / views : null,
        fechaMin: row.fecha_min,
        fechaMax: row.fecha_max,
        gastoTotal,
        cpcPorVisita: gastoTotal !== null && views > 0 ? gastoTotal / views : null,
        cpcPorClickWhatsapp: gastoTotal !== null && clicks > 0 ? gastoTotal / clicks : null,
      };
    });

    const serieResult = await pool.query<{
      fecha: string;
      landing_views: string;
      whatsapp_clicks: string;
    }>(
      `WITH bounds AS (
         SELECT
           COALESCE($1::date, CURRENT_DATE - INTERVAL '29 days')::date AS date_from,
           COALESCE($2::date, CURRENT_DATE)::date AS date_to
       ),
       days AS (
         SELECT generate_series(date_from, date_to, '1 day')::date AS fecha
         FROM bounds
       )
       SELECT
         days.fecha::text AS fecha,
         COUNT(*) FILTER (WHERE analytics_events.event_name = 'landing_view')::text AS landing_views,
         COUNT(*) FILTER (WHERE analytics_events.event_name = 'whatsapp_click')::text AS whatsapp_clicks
       FROM days
       LEFT JOIN analytics_events
         ON analytics_events.created_at::date = days.fecha
         AND analytics_events.event_name IN ('landing_view', 'whatsapp_click')
       GROUP BY days.fecha
       ORDER BY days.fecha`,
      [from, to]
    );

    const serieDiaria = serieResult.rows.map((row) => ({
      fecha: row.fecha,
      landingViews: Number(row.landing_views),
      whatsappClicks: Number(row.whatsapp_clicks),
    }));

    return NextResponse.json({
      totales: { landingViews, whatsappClicks, conversionRate },
      porFuente,
      serieDiaria,
    });
  } catch (err) {
    console.error("[api/metrics] failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
