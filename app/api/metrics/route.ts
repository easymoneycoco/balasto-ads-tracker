import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { CHANNELS } from "@/lib/channels";
import { CAMPAIGNS, CAMPAIGNS_UTM_SOURCE, CAMPAIGNS_UTM_MEDIUM } from "@/lib/campaigns";

const BOT_USER_AGENT_FILTER = `(
  user_agent IS NULL
  OR (user_agent NOT ILIKE '%facebookexternalhit%' AND user_agent NOT ILIKE '%meta-externalads%')
)`;

function deriveMetrics(views: number, clicks: number, gastoTotal: number | null) {
  return {
    conversionRate: views > 0 ? clicks / views : null,
    cpcPorVisita: gastoTotal !== null && views > 0 ? gastoTotal / views : null,
    cpcPorClickWhatsapp: gastoTotal !== null && clicks > 0 ? gastoTotal / clicks : null,
  };
}

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
         AND ${BOT_USER_AGENT_FILTER}
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

    const calendlyResult = await pool.query<{
      count: string;
      fecha_min: string | null;
      fecha_max: string | null;
    }>(
      `SELECT COUNT(*)::text AS count, MIN(created_at) AS fecha_min, MAX(created_at) AS fecha_max
       FROM analytics_events
       WHERE event_name = 'calendly_click'
         AND ${BOT_USER_AGENT_FILTER}
         AND ($1::date IS NULL OR created_at >= $1::date)
         AND ($2::date IS NULL OR created_at < ($2::date + INTERVAL '1 day'))`,
      [from, to]
    );
    const calendlyClicks = Number(calendlyResult.rows[0]?.count ?? 0);
    const calendlyFechaMin = calendlyResult.rows[0]?.fecha_min ?? null;
    const calendlyFechaMax = calendlyResult.rows[0]?.fecha_max ?? null;

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
         AND ${BOT_USER_AGENT_FILTER}
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

    function channelKey(source: string | null, medium: string | null): string {
      return JSON.stringify([source, medium]);
    }

    const eventMap = new Map<
      string,
      { views: number; clicks: number; fechaMin: string; fechaMax: string }
    >();
    for (const row of porFuenteResult.rows) {
      eventMap.set(channelKey(row.utm_source, row.utm_medium), {
        views: Number(row.landing_views),
        clicks: Number(row.whatsapp_clicks),
        fechaMin: row.fecha_min,
        fechaMax: row.fecha_max,
      });
    }

    const spendMap = new Map<string, number>();
    for (const row of spendResult.rows) {
      spendMap.set(channelKey(row.utm_source, row.utm_medium), Number(row.total));
    }

    function buildRow(label: string | null, utmSource: string | null, utmMedium: string | null) {
      const stats = eventMap.get(channelKey(utmSource, utmMedium));
      const views = stats?.views ?? 0;
      const clicks = stats?.clicks ?? 0;
      const gastoTotal = spendMap.get(channelKey(utmSource, utmMedium)) ?? null;

      return {
        label,
        utmSource,
        utmMedium,
        landingViews: views,
        whatsappClicks: clicks,
        fechaMin: stats?.fechaMin ?? null,
        fechaMax: stats?.fechaMax ?? null,
        gastoTotal,
        ...deriveMetrics(views, clicks, gastoTotal),
      };
    }

    const fixedKeys = new Set(CHANNELS.map((c) => channelKey(c.utmSource, c.utmMedium)));

    const calendlyRow = {
      label: "Agendar llamada (Calendly)",
      utmSource: "calendly",
      utmMedium: "referral",
      landingViews: null,
      whatsappClicks: calendlyClicks,
      fechaMin: calendlyFechaMin,
      fechaMax: calendlyFechaMax,
      gastoTotal: null,
      conversionRate: null,
      cpcPorVisita: null,
      cpcPorClickWhatsapp: null,
    };

    const porFuente = [
      ...CHANNELS.map((channel) => buildRow(channel.label, channel.utmSource, channel.utmMedium)),
      calendlyRow,
      ...porFuenteResult.rows
        .filter((row) => !fixedKeys.has(channelKey(row.utm_source, row.utm_medium)))
        .map((row) => buildRow(null, row.utm_source, row.utm_medium)),
    ];

    const porCampanaResult = await pool.query<{
      utm_campaign: string | null;
      landing_views: string;
      whatsapp_clicks: string;
      fecha_min: string;
      fecha_max: string;
    }>(
      `SELECT
         utm_campaign,
         COUNT(*) FILTER (WHERE event_name = 'landing_view')::text AS landing_views,
         COUNT(*) FILTER (WHERE event_name = 'whatsapp_click')::text AS whatsapp_clicks,
         MIN(created_at) AS fecha_min,
         MAX(created_at) AS fecha_max
       FROM analytics_events
       WHERE event_name IN ('landing_view', 'whatsapp_click')
         AND utm_source = $3
         AND utm_medium = $4
         AND utm_campaign = ANY($5)
         AND ${BOT_USER_AGENT_FILTER}
         AND ($1::date IS NULL OR created_at >= $1::date)
         AND ($2::date IS NULL OR created_at < ($2::date + INTERVAL '1 day'))
       GROUP BY utm_campaign`,
      [from, to, CAMPAIGNS_UTM_SOURCE, CAMPAIGNS_UTM_MEDIUM, CAMPAIGNS.map((c) => c.utmCampaign)]
    );

    const campaignSpendResult = await pool.query<{ utm_campaign: string; total: string }>(
      `SELECT utm_campaign, SUM(amount)::text AS total
       FROM ad_spend
       WHERE utm_source = $3
         AND utm_medium = $4
         AND utm_campaign = ANY($5)
         AND ($1::date IS NULL OR date_to >= $1::date)
         AND ($2::date IS NULL OR date_from <= $2::date)
       GROUP BY utm_campaign`,
      [from, to, CAMPAIGNS_UTM_SOURCE, CAMPAIGNS_UTM_MEDIUM, CAMPAIGNS.map((c) => c.utmCampaign)]
    );

    const campaignEventMap = new Map<
      string,
      { views: number; clicks: number; fechaMin: string; fechaMax: string }
    >();
    for (const row of porCampanaResult.rows) {
      if (!row.utm_campaign) continue;
      campaignEventMap.set(row.utm_campaign, {
        views: Number(row.landing_views),
        clicks: Number(row.whatsapp_clicks),
        fechaMin: row.fecha_min,
        fechaMax: row.fecha_max,
      });
    }

    const campaignSpendMap = new Map<string, number>();
    for (const row of campaignSpendResult.rows) {
      campaignSpendMap.set(row.utm_campaign, Number(row.total));
    }

    const calendlyByCampaignResult = await pool.query<{
      utm_campaign: string;
      count: string;
      fecha_min: string | null;
      fecha_max: string | null;
    }>(
      `SELECT utm_campaign, COUNT(*)::text AS count, MIN(created_at) AS fecha_min, MAX(created_at) AS fecha_max
       FROM analytics_events
       WHERE event_name = 'calendly_click'
         AND utm_source = $3
         AND utm_medium = $4
         AND utm_campaign = ANY($5)
         AND ${BOT_USER_AGENT_FILTER}
         AND ($1::date IS NULL OR created_at >= $1::date)
         AND ($2::date IS NULL OR created_at < ($2::date + INTERVAL '1 day'))
       GROUP BY utm_campaign`,
      [from, to, CAMPAIGNS_UTM_SOURCE, CAMPAIGNS_UTM_MEDIUM, CAMPAIGNS.map((c) => c.utmCampaign)]
    );

    const calendlyCampaignMap = new Map<
      string,
      { count: number; fechaMin: string | null; fechaMax: string | null }
    >();
    for (const row of calendlyByCampaignResult.rows) {
      calendlyCampaignMap.set(row.utm_campaign, {
        count: Number(row.count),
        fechaMin: row.fecha_min,
        fechaMax: row.fecha_max,
      });
    }

    const porCampaña = CAMPAIGNS.map((campaign) => {
      const gastoTotal = campaignSpendMap.get(campaign.utmCampaign) ?? null;

      if (campaign.directToCalendly) {
        const stats = calendlyCampaignMap.get(campaign.utmCampaign);
        const clicks = stats?.count ?? 0;

        return {
          label: campaign.label,
          utmCampaign: campaign.utmCampaign,
          landingViews: null,
          whatsappClicks: clicks,
          fechaMin: stats?.fechaMin ?? null,
          fechaMax: stats?.fechaMax ?? null,
          gastoTotal,
          conversionRate: null,
          cpcPorVisita: null,
          cpcPorClickWhatsapp: gastoTotal !== null && clicks > 0 ? gastoTotal / clicks : null,
        };
      }

      const stats = campaignEventMap.get(campaign.utmCampaign);
      const views = stats?.views ?? 0;
      const clicks = stats?.clicks ?? 0;

      return {
        label: campaign.label,
        utmCampaign: campaign.utmCampaign,
        landingViews: views,
        whatsappClicks: clicks,
        fechaMin: stats?.fechaMin ?? null,
        fechaMax: stats?.fechaMax ?? null,
        gastoTotal,
        ...deriveMetrics(views, clicks, gastoTotal),
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
         AND ${BOT_USER_AGENT_FILTER}
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
      totales: { landingViews, whatsappClicks, conversionRate, calendlyClicks },
      porFuente,
      porCampaña,
      serieDiaria,
    });
  } catch (err) {
    console.error("[api/metrics] failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
