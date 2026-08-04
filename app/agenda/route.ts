import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { getClientIp, hashIp } from "@/lib/tracking";

const CALENDLY_URL = "https://calendly.com/diego-balasto/30min";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    await pool.query(
      `INSERT INTO analytics_events (event_name, anon_id, utm_source, utm_medium, ip_hash, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        "calendly_click",
        crypto.randomUUID(),
        "calendly",
        "referral",
        ip ? hashIp(ip) : null,
        request.headers.get("user-agent"),
      ]
    );
  } catch (err) {
    console.error("[agenda] failed to record calendly_click", err);
  }

  return NextResponse.redirect(CALENDLY_URL, 308);
}
