import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { utmSource, utmMedium, utmCampaign, amount, currency, dateFrom, dateTo, notes } = body;

    if (!utmSource || !utmMedium || amount === undefined || amount === null || !dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "utmSource, utmMedium, amount, dateFrom y dateTo son requeridos" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO ad_spend (utm_source, utm_medium, utm_campaign, amount, currency, date_from, date_to, notes)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'MXN'), $6, $7, $8)
       RETURNING id, utm_source, utm_medium, utm_campaign, amount, currency, date_from, date_to, notes, created_at`,
      [utmSource, utmMedium, utmCampaign ?? null, amount, currency ?? null, dateFrom, dateTo, notes ?? null]
    );

    const row = result.rows[0];

    return NextResponse.json(
      {
        id: row.id,
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        utmCampaign: row.utm_campaign,
        amount: Number(row.amount),
        currency: row.currency,
        dateFrom: row.date_from,
        dateTo: row.date_to,
        notes: row.notes,
        createdAt: row.created_at,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api/spend] failed to insert", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
