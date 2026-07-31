"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import "./landing.css";

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
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

  useEffect(() => {
    track("landing_view", { ...utmParams, referrer_url: document.referrer });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleWhatsAppClick() {
    track("whatsapp_click", utmParams);
  }

  return (
    <main className="blp">
      <div className="blp-card">
        <div className="blp-logo">
          <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <polygon points="46,12 80,28 86,58 58,88 22,74 14,40" fill="#EAA956" />
          </svg>
          <img
            src="https://balasto.ai/wp-content/uploads/2026/06/balasto-wordmark-white.png"
            alt="Balasto"
            width={96}
            height={28}
          />
        </div>
        <h1 className="blp-h1">
          ¿Tienes <span className="blp-hl">unidades disponibles</span>?
        </h1>
        <p className="blp-sub">Cotiza las rutas que tenemos activas, directo por WhatsApp.</p>
        <p className="blp-lead">Haz clic abajo para escribirnos 👇</p>
        <a
          className="blp-cta"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
        >
          <svg viewBox="0 0 24 24" fill="#062E16" aria-hidden="true">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.83 14.02c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.12.11-1.81-.11-.42-.13-.95-.31-1.64-.6-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.17-1.56-1.17-2.98s.73-2.11 1-2.4c.26-.29.57-.36.76-.36s.38 0 .55.01c.18.01.41-.07.64.49.24.58.81 2 .88 2.15.07.15.12.32.02.52-.1.19-.15.32-.29.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.75 1.24 1.61 2.01 1.11.99 2.04 1.3 2.34 1.44.29.15.46.13.63-.08.17-.2.71-.83.9-1.11.19-.29.38-.24.63-.14.26.1 1.64.77 1.92.91.29.14.48.21.55.33.07.12.07.68-.17 1.36z" />
          </svg>
          Escríbenos por WhatsApp
        </a>
        <div className="blp-cta-note">Te contestamos hoy mismo.</div>
        <div className="blp-points">
          <span>
            <CheckIcon /> Todo por WhatsApp
          </span>
          <span>
            <CheckIcon /> En 2 minutos
          </span>
          <span>
            <CheckIcon /> Gratis para transportistas
          </span>
        </div>
        <div className="blp-footer">
          <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <polygon points="46,12 80,28 86,58 58,88 22,74 14,40" fill="#46639A" />
          </svg>
          Balasto — Juntos movemos la carga de México
        </div>
      </div>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#25D366"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
