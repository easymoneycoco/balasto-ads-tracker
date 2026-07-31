"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
] as const;

function getAnonId(): string {
  const key = "anon_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

function getUtmParams(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = searchParams.get(key);
    if (value) params[key] = value;
  }
  return params;
}

function track(eventName: string, extra: Record<string, string>) {
  const body = new URLSearchParams({
    event_name: eventName,
    anon_id: getAnonId(),
    ...extra,
  }).toString();

  const blob = new Blob([body], { type: "text/plain" });
  navigator.sendBeacon("/api/track", blob);
}

export default function LandingClient() {
  const searchParams = useSearchParams();
  const utmParams = getUtmParams(searchParams);
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

  useEffect(() => {
    track("landing_view", { ...utmParams, referrer_url: document.referrer });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleWhatsAppClick() {
    track("whatsapp_click", utmParams);
    window.location.href = `https://wa.me/${whatsappNumber}`;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 px-6 text-center">
      <h1 className="mb-10 max-w-xl text-3xl font-bold text-white sm:text-4xl">
        ¿Tienes unidades disponibles?
      </h1>
      <button
        onClick={handleWhatsAppClick}
        className="flex items-center gap-3 rounded-full bg-green-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-green-500/30 transition hover:bg-green-400 active:scale-95"
      >
        <WhatsAppIcon />
        Escríbenos por WhatsApp
      </button>
    </main>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.14c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.12.11-1.81-.11a16.6 16.6 0 0 1-1.62-.6c-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.09.99-2.38c.26-.28.56-.35.75-.35s.38 0 .54.01c.18.01.41-.07.64.49.24.58.81 2.01.88 2.16.07.15.12.32.02.51-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.06.94 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.53.33.07.12.07.68-.17 1.36z" />
    </svg>
  );
}
