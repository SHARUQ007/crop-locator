import catalog from "../data/catalog.json";

export const db = catalog;
export type Crop = (typeof db.crops)[number];
export type Site = (typeof db.locations)[number];
export type Cell = (typeof db.cells)[number];
export type Observation = (typeof db.summaries)[number];
export type Context = {
  crop: string;
  region: string;
  period: string;
  scenario: string;
  season: string;
  water: string;
};
export type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  scope: string;
  status: string;
  color: string;
};
export type Candidate = { siteId: string; cropId: string; context: Context };
export type Project = {
  id: string;
  name: string;
  description: string;
  goal: string;
  crop: string;
  region: string;
  status: string;
  sites: string[];
  candidates?: Candidate[];
  owner: string;
  updated: string;
  scenarios: {
    id: string;
    name: string;
    context: Context;
    sites: string[];
    assumptions?: { price: number; cost: number; logistics: number };
  }[];
  notes: { text: string; author: string; date: string }[];
  activity: string[];
};
export type Evidence = {
  id: string;
  name: string;
  locationId: string;
  cropId: string;
  type: string;
  date: string;
  note: string;
  yield?: number;
  fileName?: string;
  projectId?: string;
};
export const defaultContext: Context = {
  crop: "cotton",
  region: "Maharashtra",
  period: "baseline",
  scenario: "ssp245",
  season: "Kharif",
  water: "rainfed",
};
export const sampleProjects: Project[] = [
  {
    id: "p1",
    name: "Resilient cotton sourcing",
    description:
      "Find a resilient second origin for our 2027 cotton sourcing programme.",
    goal: "Source a crop",
    crop: "cotton",
    region: "Maharashtra",
    status: "In progress",
    sites: ["jalgaon", "akola", "wardha"],
    owner: "You",
    updated: "Today",
    scenarios: [
      {
        id: "s1",
        name: "Baseline · rainfed cotton",
        context: defaultContext,
        sites: ["jalgaon", "akola", "wardha"],
      },
    ],
    notes: [
      {
        text: "Prioritise environmental fit, then validate water access and delivered costs with the local team.",
        author: "Priya Nair",
        date: "6 Nov 2026",
      },
    ],
    activity: [
      "Priya added a decision note",
      "Arjun shortlisted Wardha",
      "You created this project",
    ],
  },
  {
    id: "p2",
    name: "Deccan maize trial network",
    description: "Fill environmental gaps in the next season’s trial network.",
    goal: "Plan seed trials",
    crop: "maize",
    region: "Karnataka",
    status: "Planning",
    sites: ["dharwad", "belagavi"],
    owner: "Arjun Mehta",
    updated: "Yesterday",
    scenarios: [],
    notes: [],
    activity: ["Arjun created this project"],
  },
  {
    id: "p3",
    name: "Estate diversification",
    description:
      "Compare lower-water crop options across the estate portfolio.",
    goal: "Choose crops for land",
    crop: "sorghum",
    region: "Telangana",
    status: "Review",
    sites: ["adilabad", "nizamabad"],
    owner: "Priya Nair",
    updated: "5 Nov",
    scenarios: [],
    notes: [],
    activity: ["Priya shortlisted two locations"],
  },
];
export const sampleMembers: Member[] = [
  {
    id: "m1",
    name: "You",
    email: "you@sbsf.demo",
    role: "Owner",
    scope: "All projects",
    status: "Active",
    color: "#d8e6ce",
  },
  {
    id: "m2",
    name: "Priya Nair",
    email: "priya@sbsf.demo",
    role: "Admin",
    scope: "All projects",
    status: "Active",
    color: "#e8dccb",
  },
  {
    id: "m3",
    name: "Arjun Mehta",
    email: "arjun@sbsf.demo",
    role: "Analyst",
    scope: "All projects",
    status: "Active",
    color: "#dee2f4",
  },
  {
    id: "m4",
    name: "Sarah Chen",
    email: "sarah@sbsf.demo",
    role: "Viewer",
    scope: "p1",
    status: "Active",
    color: "#f2ded7",
  },
];
export const sampleEvidence: Evidence[] = [
  {
    id: "e1",
    name: "Jalgaon soil screening",
    locationId: "jalgaon",
    cropId: "cotton",
    type: "Soil test",
    date: "2026-10-24",
    note: "Demo evidence: 12 composite samples. Clay texture consistent; verify drainage before a trial.",
  },
  {
    id: "e2",
    name: "Wardha 2025 trial results",
    locationId: "wardha",
    cropId: "cotton",
    type: "Field trial",
    date: "2026-09-12",
    note: "Demo evidence: observed seed-cotton yield entered by the trial team. Species-level screening does not establish hybrid performance.",
    yield: 2.48,
  },
];
export function getRecord(
  locationId: string,
  c: Context,
  cropId = c.crop,
): Observation {
  return db.summaries.find(
    (o) =>
      o.locationId === locationId &&
      o.cropId === cropId &&
      o.periodId === c.period &&
      o.scenarioId === (c.period === "baseline" ? "historical" : c.scenario) &&
      o.season === c.season &&
      o.waterRegime === c.water,
  )!;
}
export function getSite(id: string) {
  return db.locations.find((s) => s.id === id)!;
}
export function getCrop(id: string) {
  return db.crops.find((c) => c.id === id)!;
}
export function fitLabel(n: number) {
  return n >= 85
    ? "Highly suitable"
    : n >= 70
      ? "Suitable"
      : n >= 55
        ? "Moderate"
        : n >= 40
          ? "Marginal"
          : "Low suitability";
}
export function money(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function download(name: string, content: string, type = "text/plain") {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  return [
    keys.join(","),
    ...rows.map((r) =>
      keys
        .map((k) => '"' + String(r[k] ?? "").replaceAll('"', '""') + '"')
        .join(","),
    ),
  ].join("\n");
}
