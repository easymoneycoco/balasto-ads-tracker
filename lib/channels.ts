export type Channel = {
  label: string;
  utmSource: string;
  utmMedium: string;
};

export const CHANNELS: Channel[] = [
  { label: "Meta Ads", utmSource: "facebook", utmMedium: "paid" },
  { label: "Grupos de Facebook", utmSource: "facebook", utmMedium: "group" },
  { label: "Comentarios de Facebook", utmSource: "facebook", utmMedium: "comment" },
  { label: "Facebook orgánico", utmSource: "facebook", utmMedium: "organic" },
  { label: "Instagram orgánico", utmSource: "instagram", utmMedium: "organic" },
  { label: "LinkedIn Ads", utmSource: "linkedin", utmMedium: "paid" },
  { label: "LinkedIn orgánico", utmSource: "linkedin", utmMedium: "organic" },
  { label: "Comentarios de LinkedIn", utmSource: "linkedin", utmMedium: "comment" },
];
