export type Campaign = {
  label: string;
  utmCampaign: string;
};

export const CAMPAIGNS_UTM_SOURCE = "facebook";
export const CAMPAIGNS_UTM_MEDIUM = "paid";

export const CAMPAIGNS: Campaign[] = [
  { label: "Internacional", utmCampaign: "internacional" },
  { label: "Nacional", utmCampaign: "nacional" },
  { label: "Combinados", utmCampaign: "combinados" },
];
