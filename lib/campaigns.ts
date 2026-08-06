export type Campaign = {
  label: string;
  utmCampaign: string;
  /** true for campaigns that redirect straight to Calendly (no landing page view step) */
  directToCalendly?: boolean;
};

export const CAMPAIGNS_UTM_SOURCE = "facebook";
export const CAMPAIGNS_UTM_MEDIUM = "paid";

export const CAMPAIGNS: Campaign[] = [
  { label: "Internacional", utmCampaign: "internacional" },
  { label: "Nacional", utmCampaign: "nacional" },
  { label: "Combinados", utmCampaign: "combinados" },
  { label: "Llamada con Diego (Calendly)", utmCampaign: "llamada-con-diego", directToCalendly: true },
];
