import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getClientIp, hashIp } from "@/lib/tracking";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const params = new URLSearchParams(rawBody);

    const eventName = params.get("event_name");
    const anonId = params.get("anon_id");

    if (eventName && anonId) {
      const ip = getClientIp(request);

      await pool.query(
        `INSERT INTO analytics_events
           (event_name, anon_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, ip_hash, user_agent, referrer_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          eventName,
          anonId,
          params.get("utm_source"),
          params.get("utm_medium"),
          params.get("utm_campaign"),
          params.get("utm_content"),
          params.get("utm_term"),
          params.get("fbclid"),
          ip ? hashIp(ip) : null,
          request.headers.get("user-agent"),
          params.get("referrer_url"),
        ]
      );
    }
  } catch (err) {
    console.error("[api/track] failed to record event", err);
  }

  return NextResponse.json({ ok: true });
}
