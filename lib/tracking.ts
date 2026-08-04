import crypto from "crypto";
import type { NextRequest } from "next/server";

export function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || null;
}

export function hashIp(ip: string): string {
  const salt = process.env.HASH_SALT ?? "";
  return crypto.createHash("sha256").update(`${ip}${salt}`).digest("hex");
}
