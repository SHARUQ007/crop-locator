import { db, Site } from "./model";
export const countries = [
  ...new Set(db.locations.map((s) => s.country)),
].sort();
export const regions = [...new Set(db.locations.map((s) => s.region))].sort();
export function geographyLabel(value: string) {
  return value === "Worldwide"
    ? "Worldwide"
    : value === "Near me"
      ? "Choose your location"
      : value.startsWith("site:")
        ? db.locations.find((s) => s.id === value.slice(5))?.name || value
        : value;
}
export function inGeography(site: Site, value: string) {
  return (
    value === "Worldwide" ||
    site.country === value ||
    site.region === value ||
    value === "site:" + site.id
  );
}
export function defaultCountry() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones: Record<string, string> = {
    "Asia/Kolkata": "India",
    "Asia/Calcutta": "India",
    "Asia/Karachi": "Pakistan",
    "Asia/Shanghai": "China",
    "Asia/Urumqi": "China",
    "Africa/Cairo": "Egypt",
    "Europe/Istanbul": "Turkey",
    "Asia/Istanbul": "Turkey",
    "Africa/Bamako": "Mali",
    "Africa/Porto-Novo": "Benin",
    "Africa/Cotonou": "Benin",
  };
  if (zones[zone]) return zones[zone];
  if (zone.startsWith("Australia/")) return "Australia";
  if (
    [
      "America/Sao_Paulo",
      "America/Cuiaba",
      "America/Bahia",
      "America/Fortaleza",
      "America/Recife",
      "America/Belem",
      "America/Manaus",
      "America/Porto_Velho",
      "America/Rio_Branco",
      "America/Campo_Grande",
      "America/Araguaina",
      "America/Maceio",
      "America/Santarem",
    ].includes(zone)
  )
    return "Brazil";
  if (
    [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Phoenix",
      "America/Detroit",
      "America/Anchorage",
      "Pacific/Honolulu",
    ].includes(zone)
  )
    return "United States";
  return null;
}
export function nearbyGeography(lat: number, lon: number) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const ranked = db.locations
    .map((s) => {
      const a =
        Math.sin(rad(s.center[0] - lat) / 2) ** 2 +
        Math.cos(rad(lat)) *
          Math.cos(rad(s.center[0])) *
          Math.sin(rad(s.center[1] - lon) / 2) ** 2;
      return {
        site: s,
        km: 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
      };
    })
    .sort((a, b) => a.km - b.km);
  const best = ranked[0];
  return best.km < 350
    ? { region: best.site.region, method: "Nearby sample coverage" }
    : best.km < 1500
      ? {
          region: best.site.country,
          method: "Nearest country with sample coverage",
        }
      : null;
}
