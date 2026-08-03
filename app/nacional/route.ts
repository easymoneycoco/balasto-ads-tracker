import { NextRequest, NextResponse } from "next/server";
import { CAMPAIGNS_UTM_SOURCE, CAMPAIGNS_UTM_MEDIUM } from "@/lib/campaigns";

export function GET(request: NextRequest) {
  const url = new URL("/", request.url);
  url.searchParams.set("utm_source", CAMPAIGNS_UTM_SOURCE);
  url.searchParams.set("utm_medium", CAMPAIGNS_UTM_MEDIUM);
  url.searchParams.set("utm_campaign", "nacional");
  return NextResponse.redirect(url, 308);
}
