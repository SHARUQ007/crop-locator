"use client";
import SearchSelect from "../components/search-select";
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import {
  Undo2,
  Redo2,
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  X,
  Check,
  Compass,
  FolderOpen,
  Leaf,
  Database,
  Users,
  HelpCircle,
  Settings,
  SlidersHorizontal,
  MapPin,
  Bookmark,
  GitCompareArrows,
  Download,
  MoreHorizontal,
  Clock,
  CloudSun,
  Droplets,
  Layers,
  Grid2X2,
  List,
  Command,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  SquareDashedMousePointer,
  FileText,
  Share2,
  Link2,
  Copy,
  Trash2,
  Mail,
  CheckCircle2,
  Shield,
  Info,
  Upload,
  FlaskConical,
  Globe2,
  Target,
  CalendarDays,
  MessageSquare,
  CheckCheck,
  Filter,
  ExternalLink,
  LayoutGrid,
  ChevronUp,
  LoaderCircle,
} from "lucide-react";
import MarketIntelligence from "../components/market-intelligence";
import CropResults from "../components/crop-results";
import ComparisonWorkspace from "../components/comparison-workspace";
import { SearchField, SummaryStrip, NoResults, FilterSelect, CommandMenu } from "../components/workspace-ui";
import { useDismiss } from "../hooks/use-dismiss";
import { useUndoRedo } from "../hooks/use-undo-redo";
import { inSearchBounds, type SearchBounds } from "../lib/map-search";
import { matchesSearch } from "../lib/search";
import ExplorerMap from "../components/explorer-map";
const LocationDetail = lazy(() => import("../components/location-detail"));
import Onboarding from "../components/onboarding";
import LocationPicker from "../components/location-picker";
import {
  countries,
  geographyLabel,
  inGeography,
  defaultCountry,
  nearbyGeography,
} from "../lib/geography";
import { Brand, Avatar, Modal, Empty, External } from "../components/ui-kit";
import {
  db,
  Context,
  Site,
  Project,
  Member,
  Evidence,
  Candidate,
  defaultContext,
  sampleProjects,
  sampleMembers,
  sampleEvidence,
  getRecord,
  getSite,
  getCrop,
  fitLabel,
  money,
  download,
  csv,
} from "../lib/model";

type ModalName =
  | "preferences"
  | "switch-project"
  | "project"
  | "save"
  | "scenario"
  | "invite"
  | "evidence"
  | "command"
  | "help"
  | "data"
  | "crop"
  | null;
const navItems = [
  { id: "explore", label: "Explore", icon: Compass },
  { id: "compare", label: "Compare", icon: GitCompareArrows },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "crops", label: "Crop library", icon: Leaf },
  { id: "evidence", label: "Evidence", icon: Database },
  { id: "team", label: "Team", icon: Users },
];
const cropEmoji: Record<string, string> = {
  cotton: "☁",
  maize: "🌽",
  soybean: "🫘",
  sorghum: "🌾",
  wheat: "🌾",
  rice: "🌾",
};
function candidates(p: Project): Candidate[] {
  return (
    p.candidates ||
    p.sites.map((siteId) => ({
      siteId,
      cropId: p.crop,
      context: {
        ...defaultContext,
        crop: p.crop,
        region: p.region,
        season: getCrop(p.crop).season,
      },
    }))
  );
}
function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
  }, [key, value, loaded]);
  return [value, setValue, loaded] as const;
}

export default function Home() {
  const [page, setPage] = useState("explore"),
    [context, setContext] = useState<Context>({
      ...defaultContext,
      region: "Near me",
      season: "Main season",
    }),
    [mode, setMode] = useState("land"),
    [land, setLand] = useState("jalgaon");
  const [workspace, setWorkspace, ready] = useStored(
      "cl-workspace-v1",
      "SBSF Agritech",
    ),
    [onboarded, setOnboarded] = useStored("cl-onboarded-v1", false),
    [projects, setProjects] = useStored<Project[]>(
      "cl-projects-v1",
      sampleProjects,
    ),
    [members, setMembers] = useStored<Member[]>("cl-members-v1", sampleMembers),
    [evidence, setEvidence] = useStored<Evidence[]>(
      "cl-evidence-v1",
      sampleEvidence,
    );
  const [density, setDensity] = useStored("cl-density-v1", "comfortable");
  const [navCompact, setNavCompact] = useStored("cl-nav-compact-v1", false);
  const [evidenceType, setEvidenceType] = useState("all"), [evidenceCrop, setEvidenceCrop] = useState("all"),
    [teamRole, setTeamRole] = useState("all"), [teamStatus, setTeamStatus] = useState("all"),
    [projectSort, setProjectSort] = useState("recent"), [cropSort, setCropSort] = useState("name"),
    [preferencesName, setPreferencesName] = useState("");
  const [activeProject, setActiveProject] = useState("p1"),
    [projectDetail, setProjectDetail] = useState<string | null>(null),
    [projectTab, setProjectTab] = useState("Shortlist");
  const [selected, setSelected] = useState<string | null>(null),
    [selectedCell, setSelectedCell] = useState<string | null>(null),
    [comparison, setComparison] = useState<Candidate[]>([]),
    [modal, setModal] = useState<ModalName>(null),
    [filters, setFilters] = useState(false),
    [minFit, setMinFit] = useState(60),
    [lowWater, setLowWater] = useState(false),
    [verified, setVerified] = useState(false),
    [sort, setSort] = useState("fit"),
    [search, setSearch] = useState(""),
    [listSearch, setListSearch] = useState(""),
    [layer, setLayer] = useState("Suitability"),
    [zoomTo, setZoomTo] = useState(0),
    [draw, setDraw] = useState(false),
    [toast, setToast] = useState(""),
    [teamMenu, setTeamMenu] = useState(false),
    [notifications, setNotifications] = useState(false),
    [queryPeriod, setQueryPeriod] = useState(false),
    [sidebarOpen, setSidebarOpen] = useState(false),
    [projectFilter, setProjectFilter] = useState("All projects"),
    [cropCategory, setCropCategory] = useState("All crops"),
    [cropDetail, setCropDetail] = useState("cotton"),
    [isLoading, setIsLoading] = useState(false),
    [rawCells, setRawCells] = useState<any[]>([]),
    [mapExpanded, setMapExpanded] = useState(false),
    [cellLoadError, setCellLoadError] = useState(false),
    [cellRetry, setCellRetry] = useState(0);
  const [formName, setFormName] = useState(""),
    [formDescription, setFormDescription] = useState(""),
    [formGoal, setFormGoal] = useState("Source a crop"),
    [formEmail, setFormEmail] = useState(""),
    [formRole, setFormRole] = useState("Analyst"),
    [formScope, setFormScope] = useState("All projects"),
    [formType, setFormType] = useState("Field note"),
    [formSite, setFormSite] = useState("jalgaon"),
    [formCrop, setFormCrop] = useState("cotton"),
    [formDate, setFormDate] = useState("2026-11-07"),
    [formYield, setFormYield] = useState(""),
    [fileName, setFileName] = useState(""),
    [fileRows, setFileRows] = useState<any[]>([]),
    [fileError, setFileError] = useState(""),
    [note, setNote] = useState(""),
    [saveTarget, setSaveTarget] = useState("p1"),
    [assumptions, setAssumptions] = useState<
      { price: number; cost: number; logistics: number } | undefined
    >(),
    [commandQuery, setCommandQuery] = useState(""),
    [restoredAssumptions, setRestoredAssumptions] = useState<
      { price: number; cost: number; logistics: number } | undefined
    >(),
    [restoredScenario, setRestoredScenario] = useState(""),
    [geoMethod, setGeoMethod] = useState("Choose a starting location"),
    [locating, setLocating] = useState(false),
    [lens, setLens] = useState("Suitability"),
    [benchmark, setBenchmark] = useState("jalgaon");
  const [mapSearch,setMapSearch] = useState<{region:string;bounds:SearchBounds}|null>(null);
  const [mapHover,setMapHover] = useState<string|null>(null);
  const activeMapBounds = mapSearch?.region === context.region ? mapSearch.bounds : null;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceMenuRef = useDismiss(teamMenu, () => setTeamMenu(false));
  const notificationRef = useDismiss(notifications, () => setNotifications(false));
  const filterRef = useDismiss(filters, () => setFilters(false));
  const project = projects.find((p) => p.id === activeProject) || projects[0];
  const visibleSites = useMemo(
    () => db.locations.filter((s) => inGeography(s, context.region)),
    [context.region],
  );
  const rankedSites = useMemo(
    () =>
      visibleSites
        .filter((s) => {
          const o = getRecord(s.id, context);
          return (
            inSearchBounds(s.center, activeMapBounds) &&
            o.suitability >= (lens === "Growing origins" ? 0 : minFit) &&
            (lens !== "Growing origins" ||
              db.growingEvidence.some(
                (e) => e.cropId === context.crop && e.country === s.country,
              )) &&
            (lens !== "AEZ analogues" ||
              s.aezId === getSite(benchmark).aezId) &&
            (!lowWater || o.droughtRisk < 35) &&
            (!verified ||
              evidence.some(
                (e) => e.locationId === s.id && e.cropId === context.crop,
              )) &&
            matchesSearch(`${s.name} ${s.region} ${s.country} ${s.aezId}`, listSearch)
          );
        })
        .sort((a, b) =>
          sort === "water"
            ? getRecord(a.id, context).droughtRisk -
              getRecord(b.id, context).droughtRisk
            : sort === "yield"
              ? getRecord(b.id, context).yieldTHa -
                getRecord(a.id, context).yieldTHa
              : getRecord(b.id, context).suitability -
                getRecord(a.id, context).suitability,
        ),
    [
      visibleSites,
      activeMapBounds,
      context,
      minFit,
      lowWater,
      verified,
      sort,
      listSearch,
      evidence,
      lens,
      benchmark,
    ],
  );
  const history = useUndoRedo(
    { context, mode, land, selected, selectedCell, comparison, mapSearch, minFit, lowWater, verified, sort, layer, projects, members, evidence, activeProject, workspace, density, navCompact },
    (state) => {
      setContext(state.context); setMode(state.mode); setLand(state.land);
      setSelected(state.selected); setSelectedCell(state.selectedCell); setMapSearch(state.mapSearch);
      setComparison(state.comparison); setMinFit(state.minFit);
      setLowWater(state.lowWater); setVerified(state.verified);
      setSort(state.sort); setLayer(state.layer); setProjects(state.projects);
      setMembers(state.members); setEvidence(state.evidence); setActiveProject(state.activeProject);
      setWorkspace(state.workspace); setDensity(state.density); setNavCompact(state.navCompact);
      localStorage.setItem("cl-location-choice-v1", state.context.region);
    }, ready,
  );
  const rankedCrops = useMemo(
    () =>
      db.crops
        .map((c) => ({ crop: c, record: getRecord(land, context, c.id) }))
        .filter(
          (c) =>
            c.record.suitability >= minFit &&
            (!lowWater || c.record.droughtRisk < 35) &&
            (!verified ||
              evidence.some(
                (e) => e.locationId === land && e.cropId === c.crop.id,
              )) &&
            matchesSearch(`${c.crop.name} ${c.crop.category}`, listSearch),
        )
        .sort((a, b) =>
          sort === "water"
            ? a.record.droughtRisk - b.record.droughtRisk
            : sort === "margin"
              ? (b.record.yieldTHa*b.record.priceINRTonne-b.record.inputCostINRHa)-(a.record.yieldTHa*a.record.priceINRTonne-a.record.inputCostINRHa)
            : sort === "yield"
              ? b.record.yieldTHa - a.record.yieldTHa
              : b.record.suitability - a.record.suitability,
        ),
    [land, context, minFit, listSearch, lowWater, verified, evidence, sort],
  );
  const chosenCandidate: Candidate = {
    siteId: selected || land,
    cropId: context.crop,
    context: { ...context },
  };
  const isCompared = (siteId: string, cropId = context.crop) =>
    comparison.some((c) => c.siteId === siteId && c.cropId === cropId);
  const isSaved = (siteId: string, cropId = context.crop) =>
    project &&
    candidates(project).some((c) => c.siteId === siteId && c.cropId === cropId);
  useEffect(() => {
    let active = true;
    const saved = localStorage.getItem("cl-location-choice-v1");
    if (saved) {
      setContext((c) => ({ ...c, region: saved }));
      setGeoMethod("Your saved search area");
      return;
    }
    const coarse = defaultCountry();
    if (coarse) {
      setContext((c) => ({ ...c, region: coarse }));
      setGeoMethod("Approximate · device timezone");
    }
    if (navigator.permissions && navigator.geolocation)
      navigator.permissions
        .query({ name: "geolocation" })
        .then((p) => {
          if (p.state === "granted" && active) locate(true);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("demo")
    )
      setOnboarded(true);
  }, []);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setModal("command");
      }
      if (e.key === "Escape") {
        setFilters(false);
        setQueryPeriod(false);
        setTeamMenu(false);
        setNotifications(false);
        setMapExpanded(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  useEffect(() => {
    setIsLoading(true);
    setCellLoadError(false);
    setRawCells([]);
    let active = true;
    fetch(
      `/data/observations/${context.crop}-${context.period}-${context.period === "baseline" ? "historical" : context.scenario}.json`,
    )
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((rows) => {
        if (active) setRawCells(rows as any[]);
      })
      .catch(() => {
        if (active) { setRawCells([]); setCellLoadError(true); }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [context.crop, context.period, context.scenario, cellRetry]);
  useEffect(() => {
    if (!sidebarOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    sidebar?.querySelector<HTMLButtonElement>(".sidebar-mobile-close")?.focus();
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(sidebar?.querySelectorAll<HTMLElement>("button, a, input") || []).filter(el => el.getClientRects().length && !el.hasAttribute("disabled"));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const resize = () => { if (window.innerWidth > 900) setSidebarOpen(false); };
    document.addEventListener("keydown", containFocus);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("keydown", containFocus); window.removeEventListener("resize", resize); document.body.style.overflow = previousOverflow; if (previous?.isConnected) previous.focus(); };
  }, [sidebarOpen]);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }
  function resetFilters() { setMapSearch(null); setMinFit(60); setLowWater(false); setVerified(false); setListSearch(""); }
  function openPreferences() { setPreferencesName(workspace); setModal("preferences"); }
  function navigate(id: string) {
    setPage(id);
    setProjectDetail(null);
    setSearch("");
    setSidebarOpen(false);
    setModal(null);
  }
  function selectSite(id: string) {
    setSelected(id);
    requestAnimationFrame(() =>
      document
        .getElementById("explore-map")
        ?.scrollIntoView?.({ behavior: "smooth", block: "start" }),
    );
    if (mode === "crops") setLand(id);
    setSelectedCell(null);
    setRestoredAssumptions(undefined);
    setRestoredScenario("");
  }
  function chooseRegion(region: string) {
    setMapSearch(null);
    setContext((c) => ({ ...c, region }));
    setSelected(null);
    setSelectedCell(null);
    setGeoMethod(
      region === "Worldwide" ? "Worldwide exploration" : "Selected search area",
    );
    localStorage.setItem("cl-location-choice-v1", region);
  }
  function locate(silent = false) {
    if (!navigator.geolocation) {
      if (!silent)
        notify(
          "Location is unavailable in this browser. Choose a country or region.",
        );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const near = nearbyGeography(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        if (near) {
          setContext((c) => ({ ...c, region: near.region }));
          setGeoMethod(near.method);
          setSelected(null);
          if (!silent)
            notify("Showing sample areas nearest to your device location.");
        } else if (!silent) {
          notify(
            "No nearby sample coverage. Choose another region or explore worldwide.",
          );
        }
      },
      () => {
        setLocating(false);
        if (!silent)
          notify(
            "Location access was not available. Choose a region or use the approximate country default.",
          );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }
  function updateContext(c: Context) {
    setContext(c);
    setSelectedCell(null);
  }
  function toggleCompare(candidate: Candidate) {
    const exists = isCompared(candidate.siteId, candidate.cropId);
    if (exists) {
      setComparison(
        comparison.filter(
          (c) =>
            !(c.siteId === candidate.siteId && c.cropId === candidate.cropId),
        ),
      );
      return;
    }
    if (comparison.length >= 3) {
      notify("Compare up to 3 candidates. Remove one to add another.");
      return;
    }
    setComparison([...comparison, candidate]);
  }
  function openSave() {
    setSaveTarget(activeProject);
    setModal("save");
  }
  function addToProject(items: Candidate[], target = saveTarget, updateExisting = false) {
    setProjects((ps) =>
      ps.map((p) => {
        if (p.id !== target) return p;
        const next = [...candidates(p)];
        let added = 0;
        items.forEach((c) => {
          const existingIndex = next.findIndex(n => n.siteId === c.siteId && n.cropId === c.cropId);
          if (updateExisting && existingIndex >= 0) next[existingIndex] = { ...c, context: { ...c.context } };
          if (
            !next.some((n) => n.siteId === c.siteId && n.cropId === c.cropId)
          ) {
            next.push(c);
            added++;
          }
        });
        return {
          ...p,
          candidates: next,
          sites: [...new Set(next.map((c) => c.siteId))],
          updated: "Today",
          activity: [
            `You saved ${added} candidate${added === 1 ? "" : "s"} to the shortlist`,
            ...p.activity,
          ],
        };
      }),
    );
    notify(`Saved to ${projects.find((p) => p.id === target)?.name}`);
    setModal(null);
  }
  function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) { notify("Enter a project name to continue."); return; }
    const id = "p" + Date.now();
    const p: Project = {
      id,
      name: formName.trim(),
      description: formDescription,
      goal: formGoal,
      crop: context.crop,
      region: context.region,
      status: "Planning",
      sites: [],
      candidates: [],
      owner: "You",
      updated: "Today",
      scenarios: [],
      notes: [],
      activity: ["You created this project"],
    };
    setProjects([...projects, p]);
    setActiveProject(id);
    setSaveTarget(id);
    setProjectDetail(id);
    setPage("projects");
    setModal(null);
    notify("Project created. Start by adding a location.");
  }
  function openProjectForm() {
    setFormName("");
    setFormDescription("");
    setFormGoal("Source a crop");
    setModal("project");
  }
  function openScenario(a?: {
    price: number;
    cost: number;
    logistics: number;
  }) {
    setAssumptions(a);
    setFormName(
      `${getCrop(context.crop).name} · ${db.periods.find((p) => p.id === context.period)?.label} · ${context.water}`,
    );
    setSaveTarget(activeProject);
    setModal("scenario");
  }
  function saveScenario(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) { notify("Enter a scenario name to continue."); return; }
    setProjects((ps) =>
      ps.map((p) =>
        p.id === saveTarget
          ? {
              ...p,
              updated: "Today",
              scenarios: [
                ...p.scenarios,
                {
                  id: "s" + Date.now(),
                  name: formName,
                  context: { ...context },
                  sites: comparison.length
                    ? comparison.map((c) => c.siteId)
                    : selected
                      ? [selected]
                      : rankedSites.map((s) => s.id),
                  assumptions,
                },
              ],
              activity: [`You saved the scenario “${formName}”`, ...p.activity],
            }
          : p,
      ),
    );
    setModal(null);
    notify("Scenario and assumptions saved to the project.");
  }
  function openEvidence() {
    setFormName("");
    setFormDescription("");
    setFormType("Field note");
    setFormSite(selected || land);
    setFormCrop(context.crop);
    setFormYield("");
    setFormDate("2026-11-07");
    setFileName("");
    setFileRows([]);
    setFileError("");
    setModal("evidence");
  }
  function addEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!fileRows.length && (!formName.trim() || !formDescription.trim())) { notify("Add an evidence name and observation to continue."); return; }
    const rows: Evidence[] = fileRows.length
      ? fileRows.map((r, i) => ({
          id: "e" + Date.now() + i,
          name: r.name || formName,
          locationId: r.locationId,
          cropId: r.cropId,
          type: formType,
          date: r.date || formDate,
          note: r.note || formDescription,
          yield: r.yield ? +r.yield : undefined,
          fileName,
          projectId: activeProject,
        }))
      : [
          {
            id: "e" + Date.now(),
            name: formName,
            locationId: formSite,
            cropId: formCrop,
            type: formType,
            date: formDate,
            note: formDescription,
            yield: formYield ? +formYield : undefined,
            fileName: fileName || undefined,
            projectId: activeProject,
          },
        ];
    setEvidence([...evidence, ...rows]);
    setProjects((ps) =>
      ps.map((p) =>
        p.id === activeProject
          ? {
              ...p,
              activity: [
                `You attached ${rows.length} evidence record${rows.length === 1 ? "" : "s"}`,
                ...p.activity,
              ],
            }
          : p,
      ),
    );
    setModal(null);
    notify(
      `${rows.length} evidence record${rows.length === 1 ? "" : "s"} added to this demo workspace.`,
    );
  }
  async function readCsv(file: File) {
    setFileName(file.name);
    setFileError("");
    setFileRows([]);
    if (file.size > 2000000) {
      setFileError("Use a CSV smaller than 2 MB.");
      return;
    }
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/);
    const parse = (line: string) => {
      const fields: string[] = [];
      let field = "",
        quoted = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (quoted && line[i + 1] === '"') {
            field += '"';
            i++;
          } else quoted = !quoted;
        } else if (c === "," && !quoted) {
          fields.push(field.trim());
          field = "";
        } else field += c;
      }
      fields.push(field.trim());
      return fields;
    };
    const headers = parse(lines[0]);
    if (!["locationId", "cropId", "name"].every((h) => headers.includes(h))) {
      setFileError(
        "Required columns: name, locationId, cropId. Download the template below.",
      );
      return;
    }
    const rows = lines
      .slice(1)
      .filter(Boolean)
      .map((line) =>
        Object.fromEntries(parse(line).map((v, i) => [headers[i], v])),
      );
    const invalid = rows.findIndex(
      (r) =>
        !db.locations.some((s) => s.id === r.locationId) ||
        !db.crops.some((c) => c.id === r.cropId) ||
        !r.name ||
        (r.yield && (!Number.isFinite(+r.yield) || +r.yield < 0)) ||
        (r.date && !/^\d{4}-\d{2}-\d{2}$/.test(r.date)),
    );
    if (invalid >= 0) {
      setFileError(
        `Row ${invalid + 2} has an unknown location/crop, missing name, invalid date, or invalid yield.`,
      );
      return;
    }
    if (!rows.length) {
      setFileError("The CSV has no evidence rows.");
      return;
    }
    setFileRows(rows);
    if (!formName) setFormName(file.name.replace(".csv", ""));
  }
  function invite(e: React.FormEvent) {
    e.preventDefault();
    if (
      members.some((m) => m.email.toLowerCase() === formEmail.toLowerCase())
    ) {
      notify("This person already belongs to the workspace.");
      return;
    }
    setMembers([
      ...members,
      {
        id: "m" + Date.now(),
        name: formEmail.split("@")[0],
        email: formEmail,
        role: formRole,
        scope: formScope,
        status: "Pending",
        color: "#e7e9d8",
      },
    ]);
    setModal(null);
    notify("Demo invitation created. No email was sent.");
  }
  function exportRows(items: Candidate[]) {
    download(
      "croplocator-comparison.csv",
      csv(
        items.map((c) => {
          const o = getRecord(c.siteId, context, c.cropId);
          return {
            location: getSite(c.siteId).name,
            crop: getCrop(c.cropId).name,
            period: context.period,
            scenario:
              context.period === "baseline" ? "historical" : context.scenario,
            season: context.season,
            waterRegime: context.water,
            suitability: Math.round(o.suitability),
            confidence: Math.round(o.confidence),
            yieldTHa: o.yieldTHa,
            rainfallMm: o.annualRainfallMm,
            temperatureC: o.meanTemperatureC,
            synthetic: true,
          };
        }),
      ),
      "text/csv",
    );
    notify("Comparison exported with context and units.");
  }
  function exportReport(p: Project) {
    const safe = (s: string) =>
      s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    const rows = candidates(p)
      .map((c) => {
        const o = getRecord(c.siteId, c.context, c.cropId);
        return `<tr><td>${getSite(c.siteId).name}</td><td>${getCrop(c.cropId).name}</td><td>${Math.round(o.suitability)}/100</td><td>${o.yieldRange.join("–")} t/ha</td><td>${c.context.period} · ${c.context.season}</td></tr>`;
      })
      .join("");
    download(
      p.name.toLowerCase().replaceAll(" ", "-") + "-decision-brief.html",
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${safe(p.name)}</title><style>body{font:15px/1.7 system-ui;max-width:900px;margin:60px auto;color:#253b30}h1{font-size:36px}small{color:#647166}table{border-collapse:collapse;width:100%;margin:30px 0}td,th{text-align:left;padding:14px;border-bottom:1px solid #ddd}.notice{background:#f1f3e9;padding:20px}button{padding:10px 20px}@media print{button{display:none}}</style></head><body><small>CROPLOCATOR / SBSF AGRITECH · 7 NOVEMBER 2026</small><h1>${safe(p.name)}</h1><p>${safe(p.description)}</p><p>Decision objective: ${safe(p.goal)} · Owner: ${safe(p.owner)} · Status: ${safe(p.status)}</p><div class="notice"><strong>Illustrative prototype — synthetic data.</strong><br>These are screening results, not agronomic advice or production predictions. 1 km cells and AEZ assignments are mock data. Validate locally. Yield estimates are ranges; no market or weather feed is connected.</div><h2>Shortlisted candidates</h2><table><thead><tr><th>Location</th><th>Crop</th><th>Suitability</th><th>Potential yield</th><th>Context</th></tr></thead><tbody>${rows}</tbody></table><h2>Decision notes</h2>${p.notes.map((n) => `<p>${safe(n.text)}<br><small>${safe(n.author)} · ${safe(n.date)}</small></p>`).join("") || "<p>No decision rationale recorded yet.</p>"}<h2>Saved scenarios</h2>${p.scenarios.map((s) => `<p><b>${safe(s.name)}</b> · ${safe(s.context.period)} · ${safe(s.context.scenario)} · ${safe(s.context.water)}${s.assumptions ? `<br>Price: ${money(s.assumptions.price)}/t; cost: ${money(s.assumptions.cost)}/ha; logistics: ${money(s.assumptions.logistics)}/ha` : ""}</p>`).join("") || "<p>No saved scenarios.</p>"}<h2>Evidence and limits</h2><p>Model: demo-1.0. Suitability and confidence are synthetic indices. Species screening does not establish variety performance. Climate period: baseline 2021–2025; 2030s 2026–2045; 2050s 2046–2065.</p><button onclick="window.print()">Print / save as PDF</button></body></html>`,
      "text/html",
    );
    notify("Printable decision brief downloaded.");
  }
  function finishOnboarding(v: {
    workspace: string;
    project: string;
    persona: string;
    context: Context;
    invite: string;
    mode: string;
  }) {
    setWorkspace(v.workspace);
    setContext(v.context);
    localStorage.setItem("cl-location-choice-v1", v.context.region);
    setGeoMethod("Your starting location");
    setMode(v.mode.includes("crops for") ? "crops" : "land");
    setLand(
      db.locations.find((s) => inGeography(s, v.context.region))?.id ||
        "jalgaon",
    );
    setProjects((ps) =>
      ps.map((p, i) =>
        i === 0
          ? {
              ...p,
              name: v.project,
              crop: v.context.crop,
              region: v.context.region,
              goal:
                v.persona === "Seed business"
                  ? "Plan seed trials"
                  : "Source a crop",
              sites: [],
              candidates: [],
              scenarios: [],
              notes: [],
              activity: ["You created this project"],
            }
          : p,
      ),
    );
    if (v.invite)
      setMembers((ms) => [
        ...ms,
        {
          id: "m" + Date.now(),
          name: v.invite.split("@")[0],
          email: v.invite,
          role: "Analyst",
          scope: "p1",
          status: "Pending",
          color: "#e6e8dc",
        },
      ]);
    setOnboarded(true);
    notify("Your workspace is ready. Start with a location on the map.");
  }

  if (!ready)
    return (
      <div className="loading-screen">
        <Brand />
        <LoaderCircle className="spin" size={22} />
      </div>
    );
  if (!onboarded)
    return (
      <Onboarding
        initialContext={context}
        geoMethod={geoMethod}
        locating={locating}
        onLocate={() => locate()}
        onComplete={finishOnboarding}
        onDemo={() => {
          setOnboarded(true);
          notify(
            "Welcome to the demo. Your changes are saved in this browser.",
          );
        }}
      />
    );
  const detailedProject = projects.find((p) => p.id === projectDetail);
  const activeFilters =
    (minFit !== 60 ? 1 : 0) + (lowWater ? 1 : 0) + (verified ? 1 : 0);
  const currentCell = selectedCell
    ? rawCells.find(
        (o) =>
          o.cellId === selectedCell &&
          o.season === context.season &&
          o.waterRegime === context.water,
      )
    : null;
  const visibleProjects = projects.filter((p) => (projectFilter === "All projects" || p.status === projectFilter) && matchesSearch(`${p.name} ${p.description} ${p.region} ${p.status}`, search))
    .sort((a, b) => projectSort === "name" ? a.name.localeCompare(b.name) : projectSort === "candidates" ? candidates(b).length - candidates(a).length : projects.indexOf(b) - projects.indexOf(a));
  const visibleCrops = db.crops.filter((c) => (cropCategory === "All crops" || c.category === cropCategory) && matchesSearch(`${c.name} ${c.scientificName} ${c.category}`, search))
    .sort((a, b) => cropSort === "season" ? a.season.localeCompare(b.season) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  const visibleEvidence = evidence.filter((e) => (evidenceType === "all" || e.type === evidenceType) && (evidenceCrop === "all" || e.cropId === evidenceCrop) && matchesSearch(`${e.name} ${e.note} ${e.type} ${getSite(e.locationId).name} ${getCrop(e.cropId).name}`, search)).sort((a, b) => b.date.localeCompare(a.date));
  const visibleMembers = members.filter((m) => (teamRole === "all" || m.role === teamRole) && (teamStatus === "all" || m.status === teamStatus) && matchesSearch(`${m.name} ${m.email} ${m.role} ${projects.find((p) => p.id === m.scope)?.name || m.scope} ${m.status}`, search));
  return (
    <div className={"app-shell " + (navCompact ? "nav-compact" : "")} data-density={density}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={"sidebar " + (sidebarOpen ? "mobile-open" : "")} role={sidebarOpen ? "dialog" : undefined} aria-modal={sidebarOpen ? true : undefined} aria-label="Workspace navigation">
        <div className="sidebar-brand"><Brand /><button className="icon-button sidebar-collapse" aria-label={navCompact ? "Expand sidebar" : "Collapse sidebar"} title={navCompact ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setNavCompact(!navCompact)}>{navCompact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button><button className="icon-button sidebar-mobile-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X size={19} /></button></div>
        <div className="sidebar-content">
        <div className="workspace-selector" ref={workspaceMenuRef}>
          <button onClick={() => setTeamMenu(!teamMenu)} aria-expanded={teamMenu} aria-label={"Workspace: " + workspace}>
            <span className="workspace-icon">{workspace[0]?.toUpperCase() || "W"}</span>
            <span>
              {workspace}
              <small>Team workspace</small>
            </span>
            <ChevronDown size={14} />
          </button>
          {teamMenu && (
            <div className="workspace-menu popover">
              <span className="eyebrow">CURRENT WORKSPACE</span>
              <strong>{workspace}</strong>
              <button
                onClick={() => {
                  navigate("team");
                  setTeamMenu(false);
                }}
              >
                <Users size={15} />
                Manage team
              </button>
              <button
                onClick={() => {
                  openPreferences();
                  setTeamMenu(false);
                }}
              >
                <Settings size={15} />
                Workspace preferences
              </button>
            </div>
          )}
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={() => navigate(n.id)}
              className={page === n.id ? "active" : ""}
              aria-current={page === n.id ? "page" : undefined}
              title={n.label}
            >
              <n.icon size={19} strokeWidth={1.7} />
              <span className="nav-item-label">{n.label}</span>
              {n.id === "projects" && <span className="nav-count">{projects.length}</span>}
              {n.id === "team" && <span className="nav-team-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-projects">
          <div className="nav-label">
            RECENT PROJECTS
            <button
              title="Create project"
              aria-label="Create project"
              onClick={openProjectForm}
            >
              <Plus size={14} />
            </button>
          </div>
          {projects.slice(0, 3).map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                setProjectDetail(p.id);
                setActiveProject(p.id);
                setPage("projects");
                setProjectTab("Shortlist");
                setSidebarOpen(false);
              }}
            >
              <i style={{ background: ["#7c9e73", "#d4ad75", "#9d9ac4"][i] }} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
        </div>
        <div className="sidebar-bottom">
          <button className="help-button data-info-button" aria-label="Sample data and methodology" title="About the sample data" onClick={() => setModal("data")}><FlaskConical size={17} /><span>Sample data & methodology</span></button>
          <button className="help-button preferences-button" onClick={openPreferences} aria-label="Workspace preferences" title="Workspace preferences"><Settings size={17} /><span>Workspace preferences</span></button>
          <button className="help-button" aria-label="Help & getting started" title="Help & getting started" onClick={() => setModal("help")}>
            <HelpCircle size={17} />
            <span>Help & getting started</span>
            <ArrowUpRight size={13} />
          </button>
          <button className="user-profile" aria-label="Your profile and team" onClick={() => navigate("team")}>
            <Avatar name="You" color="#dce6d1" size={34} />
            <span>
              Alex Kumar<small>Workspace owner</small>
            </span>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>
      <main className="main-shell" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation"
              aria-expanded={sidebarOpen}
            >
              <List size={20} />
            </button>
            <span className="breadcrumb-workspace">Workspace</span>
            <ChevronRight size={13} />
            <strong>{navItems.find((n) => n.id === page)?.label}</strong>
            {page === "explore" && (
              <>
                <span className="crumb-divider" />
                <button
                  className="project-switch"
                  onClick={() => {
                    setModal("switch-project");
                    setSaveTarget(activeProject);
                  }}
                >
                  <span className="project-dot" />
                  {project?.name}
                  <ChevronDown size={12} />
                </button>
              </>
            )}
          </div>
          <div className="topbar-actions">
            <div className="history-controls" role="group" aria-label="Change history">
              <button className="icon-button" aria-label="Undo" title="Undo (⌘/Ctrl Z)" disabled={!history.canUndo} onClick={history.undo}><Undo2 size={17} /></button>
              <button className="icon-button" aria-label="Redo" title="Redo (⌘/Ctrl Shift Z)" disabled={!history.canRedo} onClick={history.redo}><Redo2 size={17} /></button>
            </div>
            <button
              className="command-button"
              title="Search workspace"
              onClick={() => {
                setCommandQuery("");
                setModal("command");
              }}
            >
              <Search size={15} />
              <span>Search anything</span>
              <kbd>⌘ K</kbd>
            </button>
            <div className="notification-wrap" ref={notificationRef}>
              <button
                className="icon-button"
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={18} />
                <i />
              </button>
              {notifications && (
                <div className="notification-menu popover">
                  <h3>You’re all caught up</h3>
                  <p>Your team’s latest activity</p>
                  {project?.activity.slice(0, 3).map((a, i) => (
                    <div key={i}>
                      <span className="activity-dot" />
                      <span>
                        {a}
                        <small>Demo activity</small>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="topbar-separator" />
            <div className="avatar-stack">
              {members
                .filter((m) => m.status === "Active")
                .slice(0, 3)
                .map((m) => (
                  <Avatar key={m.id} name={m.name} color={m.color} size={28} />
                ))}
            </div>
            <button
              className="invite-top"
              onClick={() => {
                setFormEmail("");
                setModal("invite");
              }}
            >
              <Plus size={14} />
              <span>Invite</span>
            </button>
          </div>
        </header>
        {page === "explore" && (
          <div className="explore-page">
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span className="live-dot" />
                  CROP & LAND EXPLORER
                </div>
                <h1>
                  {mode === "land" ? "Find your next growing location" : "Discover what your land can grow"}
                </h1>
                <p>
                  Compare environmental fit, explore scenarios and build a shortlist.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() => {
                  setSaveTarget(activeProject);
                  setFormName(
                    `${getCrop(context.crop).name} · ${context.region}`,
                  );
                  setAssumptions(undefined);
                  setModal("scenario");
                }}
              >
                <Bookmark size={15} />
                Save this search
              </button>
            </div>
            <div className="query-panel" ref={filterRef}>
              <div className="query-mode">
                <button
                  className={mode === "land" ? "active" : ""}
                  onClick={() => {
                    setMode("land");
                    if(sort === "margin") setSort("fit");
                    setListSearch("");
                  }}
                >
                  <MapPin size={15} />
                  Find land
                </button>
                <button
                  className={mode === "crops" ? "active" : ""}
                  onClick={() => {
                    setMode("crops");
                    setMapSearch(null);
                    selectSite(land);
                    setListSearch("");
                    if(sort === "yield") setSort("fit");
                  }}
                >
                  <Leaf size={15} />
                  Find crops
                </button>
              </div>
              <div className="query-fields">
                {mode === "land" ? (
                  <>
                    <label className="query-field crop-field">
                      <span>CROP</span>
                      <div>
                        <Leaf size={17} />
                        <SearchSelect
                          aria-label="Select crop"
                          value={context.crop}
                          onChange={(e) =>
                            updateContext({
                              ...context,
                              crop: e.target.value,
                              season:
                                context.region === "India" ||
                                [
                                  "Maharashtra",
                                  "Karnataka",
                                  "Telangana",
                                ].includes(context.region)
                                  ? getCrop(e.target.value).season
                                  : "Main season",
                            })
                          }
                        >
                          {db.crops.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </SearchSelect>
                      </div>
                    </label>
                    <div className="query-field region-field">
                      <span>SEARCH REGION</span>
                      <LocationPicker
                        value={context.region}
                        onChange={chooseRegion}
                        onLocate={() => locate()}
                        locating={locating}
                        method={geoMethod}
                      />
                    </div>
                  </>
                ) : (
                  <div className="query-field region-field">
                    <span>YOUR LAND / SAMPLE LOCATION</span>
                    <LocationPicker value={"site:" + land} sampleOnly onLocate={() => locate()}
                      onChange={(value) => {
                        const id = value.replace("site:", "");
                        setLand(id); setSelected(id); setSelectedCell(null);
                        setContext({ ...context, region: getSite(id).region });
                        setZoomTo((n) => n + 1);
                      }} />
                  </div>
                )}
                <label className="query-field season-field">
                  <span>GROWING SEASON</span>
                  <div>
                    <CalendarDays size={16} />
                    <SearchSelect
                      aria-label="Growing season"
                      value={context.season}
                      onChange={(e) =>
                        updateContext({ ...context, season: e.target.value })
                      }
                    >
                      <option>Main season</option>
                      <option>Kharif</option>
                      <option>Rabi</option>
                    </SearchSelect>
                  </div>
                </label>
                <label className="query-field water-field">
                  <span>WATER REGIME</span>
                  <div>
                    <Droplets size={16} />
                    <SearchSelect
                      aria-label="Water regime"
                      value={context.water}
                      onChange={(e) =>
                        updateContext({ ...context, water: e.target.value })
                      }
                    >
                      <option value="rainfed">Rainfed</option>
                      <option value="irrigated">Irrigated</option>
                    </SearchSelect>
                  </div>
                </label>
                <div className="query-filter">
                  <button
                    className={
                      "button secondary " + (filters ? "selected" : "")
                    }
                    aria-expanded={filters}
                    onClick={() => setFilters(!filters)}
                  >
                    <SlidersHorizontal size={16} />
                    Filters
                    {activeFilters > 0 && (
                      <span className="count-badge">{activeFilters}</span>
                    )}
                  </button>
                </div>
              </div>
            {filters && (
              <div className="filter-popover popover" role="dialog" aria-label="Refine search filters">
                <div className="section-heading">
                  <h3>Refine your search</h3>
                  <button
                    className="icon-button"
                    onClick={() => setFilters(false)}
                    aria-label="Close filters"
                  >
                    <X size={16} />
                  </button>
                </div>
                <label className="slider-field">
                  <span>
                    Minimum suitability<strong>{minFit}/100</strong>
                  </span>
                  <input
                    aria-label="Minimum suitability"
                    type="range"
                    min="0"
                    max="95"
                    step="5"
                    value={minFit}
                    onChange={(e) => setMinFit(+e.target.value)}
                  />
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={lowWater}
                    onChange={(e) => setLowWater(e.target.checked)}
                  />
                  <span>
                    Lower drought exposure
                    <small>Illustrative drought index below 35</small>
                  </span>
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                  />
                  <span>
                    Has team evidence
                    <small>Evidence is specific to the selected crop</small>
                  </span>
                </label>
                <label>
                  Water regime
                  <SearchSelect
                    aria-label="Filter water regime"
                    value={context.water}
                    onChange={(e) =>
                      updateContext({ ...context, water: e.target.value })
                    }
                  >
                    <option value="rainfed">Rainfed</option>
                    <option value="irrigated">Irrigated</option>
                  </SearchSelect>
                </label>
                <hr />
                <button
                  className="text-button"
                  onClick={resetFilters}
                >
                  Reset filters
                </button>
                <button
                  className="button primary"
                  onClick={() => setFilters(false)}
                >
                  Show results
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
            </div>
            <div className="context-line" role="status" aria-live="polite">
              {cellLoadError && <span className="load-warning"><Info size={13} />Cell detail unavailable · summaries still available<button onClick={() => setCellRetry((n) => n + 1)}>Retry</button></span>}
              <span>
                <span className="live-dot" />
                {isLoading
                  ? "Loading cell observations"
                  : `${mode === "land" ? rankedSites.length : rankedCrops.length} matching ${mode === "land" ? "locations" : "crops"}`}
              </span>
              <span className="context-divider" />
              <span>1 km sample grid</span>
              <span className="context-divider" />
              <button onClick={() => setQueryPeriod(!queryPeriod)}>
                <Clock size={13} />
                {db.periods.find((p) => p.id === context.period)?.range}
                {context.period !== "baseline" &&
                  ` · ${context.scenario === "ssp245" ? "SSP2-4.5" : "SSP5-8.5"}`}
                <ChevronDown size={11} />
              </button>
              <span className="pill demo-pill">Illustrative data</span>
              {activeFilters > 0 && (
                <button
                  className="clear-filters"
                  onClick={resetFilters}
                >
                  Clear {activeFilters} filters <X size={11} />
                </button>
              )}
            </div>
            <div className="explore-lensbar">
              <div
                className={
                  "explore-lenses " +
                  (mode === "crops" ? "crop-mode-lenses" : "")
                }
                aria-label="Discovery view"
              >
                {["Suitability", "Growing origins", "AEZ analogues"].map(
                  (v) => (
                    <button
                      key={v}
                      className={lens === v ? "active" : ""}
                      onClick={() => {
                        setLens(v);
                        setLayer(
                          v === "AEZ analogues" ? "AEZ classes" : "Suitability",
                        );
                      }}
                    >
                      {v === "Suitability" ? (
                        <MapPin size={15} />
                      ) : v === "Growing origins" ? (
                        <Globe2 size={15} />
                      ) : (
                        <Layers size={15} />
                      )}
                      <span>{v}</span>
                    </button>
                  ),
                )}
              </div>
              {lens === "AEZ analogues" ? (
                <label className="analogue-picker">
                  Similar environment to
                  <SearchSelect
                    value={benchmark}
                    onChange={(e) => setBenchmark(e.target.value)}
                  >
                    {db.locations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}, {s.country}
                      </option>
                    ))}
                  </SearchSelect>
                </label>
              ) : (
                <span className="scope-note">
                  {mode === "crops" ? "Selected land" : geoMethod}{" "}
                  <span>·</span>{" "}
                  {mode === "crops"
                    ? getSite(land).name
                    : geographyLabel(context.region)}
                </span>
              )}
              {(mode === "crops" || context.region !== "Worldwide") && (
                <button
                  className="worldwide-button"
                  onClick={() => {
                    setMode("land");
                    chooseRegion("Worldwide");
                  }}
                >
                  <Globe2 size={14} />
                  {mode === "crops"
                    ? `Other ${getCrop(context.crop).name.toLowerCase()} origins`
                    : "Explore worldwide"}
                  <ArrowUpRight size={13} />
                </button>
              )}
              {selected && (
                <a
                  className="selected-location-tab"
                  href="#location-intelligence"
                >
                  <span className="live-dot" />
                  View {getSite(selected).name} details
                  <ChevronDown size={13} />
                </a>
              )}
            </div>
            <div
              id="explore-map"
              className={"explorer " + (selected ? "has-detail " : "") + (mapExpanded ? "map-expanded" : "")}
            >
              <aside className="results-panel">
                <div className="results-heading">
                  <div>
                    <h2>
                      {mode === "land"
                        ? lens === "Growing origins"
                          ? "Known growing origins"
                          : lens === "AEZ analogues"
                            ? "Similar environments"
                            : "Suitable locations"
                        : "Crops to consider"}
                    </h2>
                    <p>
                      {mode === "land"
                        ? lens === "Growing origins"
                          ? "Documented at country level."
                          : lens === "AEZ analogues"
                            ? `Same class as ${getSite(benchmark).name}.`
                            : "Ranked for the selected growing context."
                        : `Environmental matches for ${getSite(land).name}.`}
                    </p>
                  </div>
                  <button
                    className="icon-button"
                    title="Export ranked results"
                    onClick={() =>
                      exportRows(
                        mode === "land"
                          ? rankedSites.map((s) => ({
                              siteId: s.id,
                              cropId: context.crop,
                              context,
                            }))
                          : rankedCrops.map((c) => ({
                              siteId: land,
                              cropId: c.crop.id,
                              context,
                            })),
                      )
                    }
                  >
                    <Download size={16} />
                  </button>
                </div>
                <div className="result-tools">
                  <span>
                    {mode === "land" ? rankedSites.length : rankedCrops.length}{" "}
                    results
                  </span>
                  <label>
                    Sort by{" "}
                    <SearchSelect
                      aria-label="Sort results"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="fit">Best fit</option>
                      <option value="water">Lowest water risk</option>
                      {mode === "land" ? <option value="yield">Highest yield</option> : <option value="margin">Illustrative margin</option>}
                    </SearchSelect>
                  </label>
                </div>
                <div className="results-search">
                  <Search size={13} />
                  <input
                    aria-label="Filter results"
                    placeholder={
                      mode === "land" ? "Find a location…" : "Find a crop…"
                    }
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                  />
                  {listSearch && (
                    <button
                      onClick={() => setListSearch("")}
                      aria-label="Clear result search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="results-scroll">
                  {mode === "land"
                    ? rankedSites.map((s, i) => {
                        const o = getRecord(s.id, context);
                        return (
                          <article
                            className={
                              "result-card " +
                              (selected === s.id ? "selected" : "")
                            }
                            key={s.id}
                            onMouseEnter={()=>setMapHover(s.id)} onMouseLeave={()=>setMapHover(null)}
                            onFocus={()=>setMapHover(s.id)} onBlur={()=>setMapHover(null)}
                          >
                            <button
                              className="result-card-main"
                              onClick={() => selectSite(s.id)}
                            >
                              <div className="result-title">
                                <span className="result-rank">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                <div>
                                  <h3>{s.name}</h3>
                                  <p>
                                    {context.region === "Worldwide"
                                      ? s.country
                                      : s.region}{" "}
                                    <span>·</span> {s.aezId}
                                  </p>
                                </div>
                                <span
                                  className={
                                    "score " +
                                    (o.suitability < 85 ? "moderate" : "")
                                  }
                                >
                                  {Math.round(o.suitability)}
                                  <small>/100</small>
                                </span>
                              </div>
                              <div className="result-match">
                                <span
                                  className={
                                    "status-dot " +
                                    (o.suitability < 85 ? "lighter" : "")
                                  }
                                />
                                {fitLabel(o.suitability)}
                                {evidence.some(
                                  (e) =>
                                    e.locationId === s.id &&
                                    e.cropId === context.crop,
                                ) && (
                                  <span
                                    className="evidence-tag"
                                    title="Has demo team evidence"
                                  >
                                    <FileText size={11} />
                                    Evidence
                                  </span>
                                )}
                              </div>
                              <div className="result-metrics">
                                <div>
                                  <span>Potential yield</span>
                                  <strong>
                                    {o.yieldRange[0]}–{o.yieldRange[1]}
                                    <small> t/ha</small>
                                  </strong>
                                </div>
                                <div>
                                  <span>Drought exposure</span>
                                  <strong>
                                    {o.droughtRisk < 30 ? "Low" : "Moderate"}
                                    <i
                                      className={
                                        "risk-dot " +
                                        (o.droughtRisk >= 30 ? "amber" : "")
                                      }
                                    />
                                  </strong>
                                </div>
                              </div>
                            </button>
                            <div className="result-card-actions">
                              <button
                                className={isCompared(s.id) ? "checked" : ""}
                                aria-pressed={isCompared(s.id)}
                                title={isCompared(s.id) ? "Remove from comparison shortlist" : "Add to comparison shortlist"}
                                onClick={() =>
                                  toggleCompare({
                                    siteId: s.id,
                                    cropId: context.crop,
                                    context: { ...context },
                                  })
                                }
                              >
                                {isCompared(s.id) ? (
                                  <Check size={13} />
                                ) : (
                                  <Plus size={13} />
                                )}
                                Compare
                              </button>
                              <button
                                className={isSaved(s.id) ? "saved" : ""}
                                title={
                                  isSaved(s.id)
                                    ? "Saved to active project"
                                    : "Save to project"
                                }
                                onClick={() => {
                                  selectSite(s.id);
                                  setSaveTarget(activeProject);
                                  setModal("save");
                                }}
                              >
                                {isSaved(s.id) ? (
                                  <Check size={14} />
                                ) : (
                                  <Bookmark size={14} />
                                )}
                              </button>
                            </div>
                          </article>
                        );
                      })
                    : <CropResults items={rankedCrops} site={getSite(land)} context={context} evidence={evidence} compared={comparison.filter(c=>c.siteId===land).map(c=>c.cropId)}
                        onSelect={cropId=>{setContext({...context,crop:cropId});selectSite(land);}}
                        onCompare={cropId=>toggleCompare({siteId:land,cropId,context:{...context,crop:cropId}})}
                        onProfile={cropId=>{setCropDetail(cropId);setModal("crop");}} />}
                  {mode === "crops" && rankedCrops.length > 0 && <p className="crop-screening-note">Ranked within this search context. Yield ranges describe different crop products and are not directly interchangeable.</p>}
                  {!(mode === "land"
                    ? rankedSites.length
                    : rankedCrops.length) && (
                    <Empty
                      title="Room to explore"
                      text="Choose a location, lower the fit threshold, or explore worldwide to discover other suitable regions."
                    >
                      <button
                        className="button secondary"
                        onClick={() => {
                          setMinFit(0);
                          setLowWater(false);
                          setVerified(false);
                          setListSearch("");
                        }}
                      >
                        Reset filters
                      </button>
                    </Empty>
                  )}
                </div>
              </aside>
              <div className="map-workspace">
                <ExplorerMap
                  expanded={mapExpanded}
                  onExpand={() => setMapExpanded(!mapExpanded)}
                  onCountry={chooseRegion}
                  context={
                    mode === "crops"
                      ? { ...context, region: "site:" + land }
                      : context
                  }
                  sites={mode === "crops" ? [getSite(land)] : rankedSites}
                  coverageSites={mode === "crops" ? [getSite(land)] : visibleSites}
                  query={mode === "land" ? listSearch : ""}
                  areaActive={mode === "land" && !!activeMapBounds}
                  onBoundsSearch={mode === "land" ? bounds=>setMapSearch({region:context.region,bounds}) : undefined}
                  onClearArea={()=>setMapSearch(null)} onResetFilters={resetFilters}
                  onClearSelection={()=>{setSelected(null);setSelectedCell(null);}}
                  onDrawCancel={()=>setDraw(false)} hovered={mapHover} onHover={setMapHover}
                  selected={selected}
                  onSelect={selectSite}
                  onCell={(id) => setSelectedCell(id)}
                  layer={layer}
                  onLayer={setLayer}
                  zoomTo={zoomTo}
                  draw={draw}
                  onDraw={(ids) => {
                    setDraw(false);
                    if (!ids.length) {
                      notify(
                        "No sampled locations inside this selection. Try a larger area.",
                      );
                      return;
                    }
                    setComparison(
                      ids
                        .slice(0, 3)
                        .map((siteId) => ({
                          siteId,
                          cropId: context.crop,
                          context: { ...context },
                        })),
                    );
                    notify(
                      `${Math.min(ids.length, 3)} locations added to comparison.`,
                    );
                  }}
                />
                <button
                  className={"draw-button " + (draw ? "active" : "")}
                  title="Select sampled locations by area"
                  onClick={() => setDraw(!draw)}
                >
                  <SquareDashedMousePointer size={16} />
                  {draw ? "Cancel selection" : "Select an area"}
                </button>
                <div className="time-travel">
                  <span>
                    <Clock size={15} />
                    Time travel
                  </span>
                  <div>
                    {db.periods.map((p) => (
                      <button
                        key={p.id}
                        className={context.period === p.id ? "active" : ""}
                        onClick={() =>
                          updateContext({ ...context, period: p.id })
                        }
                      >
                        {p.label}
                        {context.period === p.id && (
                          <span className="live-dot" />
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    className="time-settings"
                    title="Climate scenario settings"
                    aria-label="Climate scenario settings"
                    onClick={() => setQueryPeriod(!queryPeriod)}
                  >
                    <SlidersHorizontal size={15} />
                  </button>
                </div>
                {queryPeriod && (
                  <div className="time-popover popover">
                    <div className="section-heading">
                      <h3>Explore through time</h3>
                      <button
                        className="icon-button"
                        onClick={() => setQueryPeriod(false)}
                        aria-label="Close time settings"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    {db.periods.map((p) => (
                      <button
                        className="period-option"
                        key={p.id}
                        onClick={() =>
                          updateContext({ ...context, period: p.id })
                        }
                      >
                        <span>
                          <strong>{p.label}</strong>
                          <small>
                            {p.range} ·{" "}
                            {p.kind === "historical"
                              ? "Synthetic baseline"
                              : "Illustrative projection"}
                          </small>
                        </span>
                        {context.period === p.id && <Check size={16} />}
                      </button>
                    ))}
                    <label>
                      Future climate scenario
                      <SearchSelect
                        aria-label="Climate scenario"
                        value={context.scenario}
                        onChange={(e) =>
                          updateContext({
                            ...context,
                            scenario: e.target.value,
                          })
                        }
                      >
                        <option value="ssp245">SSP2-4.5 · intermediate</option>
                        <option value="ssp585">
                          SSP5-8.5 · very high emissions
                        </option>
                      </SearchSelect>
                    </label>
                    <p className="caption">
                      A multi-year climate period is not a forecast for a
                      specific growing season.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => openScenario()}
                    >
                      Save as a scenario
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}
                {selectedCell && currentCell && (
                  <div className="cell-floating">
                    <span>{selectedCell}</span>
                    <strong>{currentCell.suitability}/100</strong>
                    <small>
                      1 km synthetic cell · {currentCell.yieldTHa} t/ha
                    </small>
                  </div>
                )}
              </div>
            </div>
            {comparison.length > 0 && (
              <div className="compare-tray">
                <div className="tray-label"><GitCompareArrows size={18}/><span>Comparison shortlist<small>{comparison.length} of 3 candidates</small></span></div>
                <div className="tray-candidates">
                  {comparison.map(c=><span key={c.siteId+c.cropId}>{getSite(c.siteId).name}{` · ${getCrop(c.cropId).name}`}<button aria-label={`Remove ${getSite(c.siteId).name} ${getCrop(c.cropId).name}`} onClick={()=>toggleCompare(c)}><X size={12}/></button></span>)}
                  {comparison.length<2&&<small>Add one more to compare</small>}
                </div>
                <button className="text-button tray-clear" onClick={()=>setComparison([])}>Clear</button>
                <button className="button primary" onClick={()=>navigate("compare")}>{comparison.length<2?'Choose another':`Compare ${comparison.length}`}<ArrowRight size={15}/></button>
              </div>
            )}
            <div id="location-intelligence" className="location-below">
              {selected && (
                <Suspense
                  fallback={
                    <section className="detail-loading">
                      <LoaderCircle className="spin" size={19} />
                      Loading location intelligence…
                    </section>
                  }
                >
                  <LocationDetail
                    onAnalogues={() => {
                      setBenchmark(selected);
                      setLens("AEZ analogues");
                      setLayer("AEZ classes");
                      setContext({ ...context, region: "Worldwide" });
                      document
                        .getElementById("explore-map")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    key={selected + restoredScenario}
                    initialAssumptions={restoredAssumptions}
                    cellObservation={currentCell}
                    site={getSite(selected)}
                    context={context}
                    cellId={selectedCell}
                    evidence={evidence}
                    saved={isSaved(selected)}
                    compared={isCompared(selected)}
                    onClose={() => {
                      setSelected(null);
                      setSelectedCell(null);
                    }}
                    onSave={openSave}
                    onCompare={() => {
                      if (!isCompared(chosenCandidate.siteId, chosenCandidate.cropId)) {
                        setComparison((items) => [...items.slice(0, 2), chosenCandidate]);
                      }
                      navigate("compare");
                    }}
                    cropOpportunities={mode === "crops"}
                    onCompareCrop={(cropId) => toggleCompare({ siteId: selected, cropId, context: { ...context, crop: cropId } })}
                    comparedCrops={comparison.filter((c) => c.siteId === selected).map((c) => c.cropId)}
                    onZoom={() => setZoomTo((n) => n + 1)}
                    onEvidence={openEvidence}
                    onScenario={openScenario}
                    onContext={updateContext}
                  />
                </Suspense>
              )}
            </div>
            {selected && <MarketIntelligence key={selected+context.crop} site={getSite(selected)} context={context} onEvidence={openEvidence}/> }
            <div className="explore-footer">
              <span>
                <Shield size={12} />
                Your team’s workspace. Your decisions.
              </span>
              <button onClick={() => setModal("data")}>
                Synthetic demo data · Method & sources
                <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        )}

        {page === "compare" && <div className="content-page compare-page"><button className="text-button compare-back" onClick={()=>navigate("explore")}><ArrowLeft size={15}/>Back to explorer</button><div className="page-heading"><div><div className="eyebrow">CANDIDATE WORKSPACE</div><h1>Compare possibilities</h1></div></div>
          <ComparisonWorkspace candidates={comparison} context={context} initialSite={selected || land} evidence={evidence}
            onAdd={(siteId,cropId) => toggleCompare({siteId,cropId,context:{...context,crop:cropId}})}
            onRemove={toggleCompare}
            onInspect={(candidate) => { setSelected(candidate.siteId); setContext({...candidate.context,crop:candidate.cropId,region:getSite(candidate.siteId).region}); setLand(candidate.siteId);navigate("explore");requestAnimationFrame(()=>document.getElementById("location-intelligence")?.scrollIntoView({behavior:"smooth"})); }}
            onSave={(items) => addToProject(items,activeProject,true)} />
        </div>}

        {page === "projects" && (
          <div className="content-page projects-page">
            {!detailedProject ? (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">FROM EXPLORATION TO ACTION</div>
                    <h1>
                      Your projects
                    </h1>
                    <p>
                      Keep candidates, scenarios, evidence and decisions together.
                    </p>
                  </div>
                  <button className="button primary" onClick={openProjectForm}>
                    <Plus size={16} />
                    New project
                  </button>
                </div>
                <SummaryStrip items={[
                  {label:"Projects", value:projects.length, icon:FolderOpen},
                  {label:"Shortlisted candidates", value:projects.reduce((n,p) => n + candidates(p).length,0),icon:MapPin},
                  {label:"Saved scenarios", value:projects.reduce((n,p) => n + p.scenarios.length,0),icon:Layers},
                  {label:"Ready for review", value:projects.filter((p) => p.status === "Review" || p.status === "Decided").length,icon:CheckCircle2},
                ]} />
                <div className="content-toolbar">
                  <div className="segmented">
                    {["All projects", "In progress", "Planning", "Review", "Decided"].map(
                      (s) => (
                        <button
                          key={s}
                          className={projectFilter === s ? "active" : ""}
                          onClick={() => setProjectFilter(s)}
                        >
                          {s}
                          {s === "All projects" && (
                            <span>{projects.length}</span>
                          )}
                        </button>
                      ),
                    )}
                  </div>
                  <div className="toolbar-end"><FilterSelect label="Sort projects" value={projectSort} onChange={setProjectSort} options={[{value:"recent",label:"Newest first"},{value:"name",label:"Name A–Z"},{value:"candidates",label:"Most candidates"}]} /><SearchField label="Search projects" value={search} onChange={setSearch} /></div>
                </div>
                <div className="results-caption" role="status">{visibleProjects.length} of {projects.length} projects{search && ` matching “${search}”`}</div>
                {!visibleProjects.length && <NoResults subject="projects" onReset={() => { setSearch(""); setProjectFilter("All projects"); }} />}
                <div className="project-grid">
                  {visibleProjects
                    .map((p, i) => (
                      <button
                        className="project-card"
                        key={p.id}
                        onClick={() => {
                          setProjectDetail(p.id);
                          setActiveProject(p.id);
                          setProjectTab("Shortlist");
                        }}
                      >
                        <div className={"project-art art-" + (i % 3)}>
                          <div className="art-grid" />
                          <div className="art-river" />
                          {[1, 2, 3].map((n) => (
                            <i
                              key={n}
                              style={{
                                left: 20 + n * 16 + "%",
                                top: 25 + (n % 2) * 25 + "%",
                              }}
                            />
                          ))}
                          <span>
                            <MapPin size={12} />
                            {p.region}
                          </span>
                          <span
                            className={
                              "project-status status-" +
                              p.status.replaceAll(" ", "").toLowerCase()
                            }
                          >
                            {p.status}
                          </span>
                        </div>
                        <div className="project-card-body">
                          <div className="eyebrow">{p.goal}</div>
                          <h2>
                            {p.name}
                            <ArrowUpRight size={18} />
                          </h2>
                          <p>{p.description}</p>
                          <div className="project-stats">
                            <span>
                              <MapPin size={14} />
                              {candidates(p).length} candidates
                            </span>
                            <span>
                              <Layers size={14} />
                              {p.scenarios.length} scenarios
                            </span>
                          </div>
                          <div className="project-card-footer">
                            <span>
                              <Avatar name={p.owner} size={24} />
                              {p.owner}
                            </span>
                            <small>{p.updated}</small>
                          </div>
                        </div>
                      </button>
                    ))}
                  <button
                    className="new-project-card"
                    onClick={openProjectForm}
                  >
                    <span>
                      <Plus size={24} />
                    </span>
                    <h3>Make room for what’s next</h3>
                    <p>
                      Start with a question.
                      <br />
                      Build towards a decision.
                    </p>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  className="text-button back-link"
                  onClick={() => setProjectDetail(null)}
                >
                  <ArrowLeft size={15} />
                  All projects
                </button>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      {detailedProject.goal.toUpperCase()}{" "}
                      <span> / {detailedProject.region}</span>
                    </div>
                    <h1>
                      {detailedProject.name}
                      <span>.</span>
                    </h1>
                    <p>{detailedProject.description}</p>
                  </div>
                  <div className="button-row">
                    <button
                      className="button secondary"
                      onClick={() => exportReport(detailedProject)}
                    >
                      <Download size={15} />
                      Decision brief
                    </button>
                    <button
                      className="button primary"
                      onClick={() => {
                        setContext({
                          ...defaultContext,
                          crop: detailedProject.crop,
                          region: detailedProject.region,
                          season: getCrop(detailedProject.crop).season,
                        });
                        setPage("explore");
                        setActiveProject(detailedProject.id);
                        setSelected(null);
                      }}
                    >
                      <Plus size={15} />
                      Explore candidates
                    </button>
                  </div>
                </div>
                <SummaryStrip items={[
                  {label:"Candidates",value:candidates(detailedProject).length,icon:MapPin},
                  {label:"Scenarios",value:detailedProject.scenarios.length,icon:Layers},
                  {label:"Evidence records",value:evidence.filter((e) => e.projectId === detailedProject.id).length,icon:Database},
                  {label:"Decision notes",value:detailedProject.notes.length,icon:MessageSquare},
                ]} />
                <div className="project-meta">
                  <label>
                    Status
                    <SearchSelect
                      aria-label="Project status"
                      value={detailedProject.status}
                      onChange={(e) =>
                        setProjects((ps) =>
                          ps.map((p) =>
                            p.id === detailedProject.id
                              ? {
                                  ...p,
                                  status: e.target.value,
                                  updated: "Today",
                                  activity: [
                                    `You changed status to ${e.target.value}`,
                                    ...p.activity,
                                  ],
                                }
                              : p,
                          ),
                        )
                      }
                    >
                      {["Planning", "In progress", "Review", "Decided"].map(
                        (s) => (
                          <option key={s}>{s}</option>
                        ),
                      )}
                    </SearchSelect>
                  </label>
                  <span>
                    <Avatar name={detailedProject.owner} size={24} />
                    {detailedProject.owner}
                    <small>Project lead</small>
                  </span>
                  <span>
                    <CalendarDays size={14} />
                    2027 growing season
                  </span>
                  <button
                    className="text-button"
                    onClick={() => {
                      setFormScope(detailedProject.id);
                      setFormEmail("");
                      setModal("invite");
                    }}
                  >
                    <Users size={14} />
                    Manage access
                  </button>
                </div>
                <div className="page-tabs">
                  {["Shortlist", "Scenarios", "Decision notes", "Activity"].map(
                    (t) => (
                      <button
                        key={t}
                        className={projectTab === t ? "active" : ""}
                        onClick={() => setProjectTab(t)}
                      >
                        {t}
                        {t === "Shortlist" && (
                          <span>{candidates(detailedProject).length}</span>
                        )}
                      </button>
                    ),
                  )}
                </div>
                {projectTab === "Shortlist" && (
                  <>
                    {candidates(detailedProject).length ? (
                      <>
                        <div className="section-heading">
                          <div>
                            <h2>Candidate shortlist</h2>
                            <p className="body-muted">
                              Saved with their crop and search context. Select
                              two or three to compare.
                            </p>
                          </div>
                          <button
                            className="button secondary"
                            disabled={comparison.length < 2}
                            onClick={() => navigate("compare")}
                          >
                            <GitCompareArrows size={15} />
                            Compare {comparison.length > 0 && comparison.length}
                          </button>
                        </div>
                        <div className="shortlist-table table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th aria-label="Select" />
                                <th>Location & crop</th>
                                <th>Environmental fit</th>
                                <th>Yield range</th>
                                <th>Saved context</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {candidates(detailedProject).map((c) => {
                                const s = getSite(c.siteId),
                                  o = getRecord(c.siteId, c.context, c.cropId);
                                return (
                                  <tr key={c.siteId + c.cropId}>
                                    <td>
                                      <input
                                        type="checkbox"
                                        aria-label={`Select ${s.name} ${getCrop(c.cropId).name}`}
                                        checked={isCompared(c.siteId, c.cropId)}
                                        onChange={() => toggleCompare(c)}
                                      />
                                    </td>
                                    <td>
                                      <button
                                        className="table-link"
                                        onClick={() => {
                                          setContext(c.context);
                                          setSelected(c.siteId);
                                          setPage("explore");
                                        }}
                                      >
                                        {s.name}
                                        <ArrowUpRight size={13} />
                                      </button>
                                      <small>
                                        {getCrop(c.cropId).name} · {s.aezId}
                                      </small>
                                    </td>
                                    <td>
                                      <span className="table-score">
                                        {Math.round(o.suitability)}
                                        <small>/100</small>
                                      </span>
                                      <span className="pill green">
                                        {fitLabel(o.suitability)}
                                      </span>
                                    </td>
                                    <td>{o.yieldRange.join("–")} t/ha</td>
                                    <td>
                                      {c.context.period}
                                      <small>
                                        {c.context.season} · {c.context.water}
                                      </small>
                                    </td>
                                    <td>
                                      <button
                                        className="icon-button"
                                        title="Remove candidate"
                                        aria-label={`Remove ${s.name}`}
                                        onClick={() => {
                                          setProjects((ps) =>
                                            ps.map((p) =>
                                              p.id === detailedProject.id
                                                ? {
                                                    ...p,
                                                    candidates: candidates(
                                                      p,
                                                    ).filter(
                                                      (x) =>
                                                        !(
                                                          x.siteId ===
                                                            c.siteId &&
                                                          x.cropId === c.cropId
                                                        ),
                                                    ),
                                                    updated: "Today",
                                                    activity: [
                                                      `You removed ${s.name} from the shortlist`,
                                                      ...p.activity,
                                                    ],
                                                  }
                                                : p,
                                            ),
                                          );
                                          notify(
                                            "Candidate removed from this project.",
                                          );
                                        }}
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <Empty
                        title="Your shortlist starts on the map"
                        text="Explore environments, inspect a candidate and save it to this project."
                      >
                        <button
                          className="button primary"
                          onClick={() => {
                            setPage("explore");
                            setActiveProject(detailedProject.id);
                          }}
                        >
                          Explore the map
                          <ArrowRight size={15} />
                        </button>
                      </Empty>
                    )}
                    <div className="project-next">
                      <span className="source-icon">
                        <Target size={20} />
                      </span>
                      <div>
                        <h3>Make the next step a local one.</h3>
                        <p>
                          Attach soil tests and trial results, then record why
                          the shortlist works for your team.
                        </p>
                      </div>
                      <button
                        className="button secondary"
                        onClick={openEvidence}
                      >
                        Add evidence
                        <Plus size={14} />
                      </button>
                    </div>
                  </>
                )}
                {projectTab === "Scenarios" && (
                  <div className="scenario-list">
                    <div className="section-heading"><div><h2>Saved scenarios</h2><p className="body-muted">Reopen a search with its climate and economic assumptions.</p></div><button className="button secondary" onClick={() => { setActiveProject(detailedProject.id); openScenario(); }}><Plus size={15} />Save current context</button></div>
                    {detailedProject.scenarios.length ? (
                      detailedProject.scenarios.map((s) => (
                        <div className="scenario-card" key={s.id}>
                          <span className="source-icon">
                            <Layers size={21} />
                          </span>
                          <div>
                            <h3>{s.name}</h3>
                            <p>
                              {getCrop(s.context.crop).name} ·{" "}
                              {s.context.region} · {s.context.season} ·{" "}
                              {s.context.water}
                            </p>
                            <small>
                              {
                                db.periods.find(
                                  (p) => p.id === s.context.period,
                                )?.range
                              }{" "}
                              ·{" "}
                              {s.context.period === "baseline"
                                ? "Historical sample"
                                : s.context.scenario === "ssp245"
                                  ? "SSP2-4.5"
                                  : "SSP5-8.5"}{" "}
                              · {s.sites.length} locations
                            </small>
                            {s.assumptions && (
                              <small>
                                Price {money(s.assumptions.price)}/t · Cost{" "}
                                {money(s.assumptions.cost)}/ha · Logistics{" "}
                                {money(s.assumptions.logistics)}/ha
                              </small>
                            )}
                          </div>
                          <button
                            className="button secondary"
                            onClick={() => {
                              setContext(s.context);
                              setLand(s.sites[0] || land);
                              setSelected(s.sites[0] || null);
                              setRestoredAssumptions(s.assumptions);
                              setRestoredScenario(s.id);
                              setPage("explore");
                              notify(
                                "Saved scenario and assumptions restored.",
                              );
                            }}
                          >
                            Open scenario
                            <ArrowUpRight size={15} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Delete ${s.name}`}
                            onClick={() =>
                              setProjects((ps) =>
                                ps.map((p) =>
                                  p.id === detailedProject.id
                                    ? {
                                        ...p,
                                        scenarios: p.scenarios.filter(
                                          (x) => x.id !== s.id,
                                        ),
                                      }
                                    : p,
                                ),
                              )
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <Empty
                        title="Keep your what-ifs together"
                        text="Save a search or economic assumption from Explore to create a scenario."
                      >
                        <button
                          className="button primary"
                          onClick={() => setPage("explore")}
                        >
                          Explore scenarios
                          <ArrowRight size={15} />
                        </button>
                      </Empty>
                    )}
                  </div>
                )}
                {projectTab === "Decision notes" && (
                  <div className="notes-layout">
                    <div>
                      <h2>Leave the reasoning, not just the result.</h2>
                      <p className="body-muted">
                        Record trade-offs, validation needs and the team’s
                        decision.
                      </p>
                      <form
                        className="note-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!note.trim()) return;
                          setProjects((ps) =>
                            ps.map((p) =>
                              p.id === detailedProject.id
                                ? {
                                    ...p,
                                    notes: [
                                      {
                                        text: note,
                                        author: "You",
                                        date: "7 Nov 2026",
                                      },
                                      ...p.notes,
                                    ],
                                    activity: [
                                      "You added a decision note",
                                      ...p.activity,
                                    ],
                                    updated: "Today",
                                  }
                                : p,
                            ),
                          );
                          setNote("");
                          notify("Decision note added.");
                        }}
                      >
                        <textarea
                          required
                          aria-label="Decision note"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="What matters for this decision? What needs validation?"
                        />
                        <button className="button primary" disabled={!note.trim()}>
                          Add note
                          <MessageSquare size={15} />
                        </button>
                      </form>
                      {detailedProject.notes.map((n, i) => (
                        <article className="note-card" key={i}>
                          <Avatar name={n.author} />
                          <div>
                            <strong>
                              {n.author}
                              <small>{n.date}</small>
                            </strong>
                            <p>{n.text}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                    <aside className="decision-checklist">
                      <h3>Decision checklist</h3><span className="checklist-progress">{detailedProject.checklist?.length || 0} of 4 complete</span>
                      <p>A useful decision leaves a clear trail.</p>
                      {[
                        "Compare environmental fit",
                        "Check local evidence",
                        "Test commercial assumptions",
                        "Record the rationale",
                      ].map((s, i) => (
                        <label key={s}>
                          <input
                            type="checkbox"
                            checked={detailedProject.checklist?.includes(s) || false}
                            onChange={(e) => setProjects((ps) => ps.map((p) => p.id === detailedProject.id ? { ...p, checklist:e.target.checked ? [...(p.checklist || []),s] : (p.checklist || []).filter((item) => item !== s) } : p))}
                          />
                          {s}
                        </label>
                      ))}
                    </aside>
                  </div>
                )}
                {projectTab === "Activity" && (
                  <div className="activity-list">
                    <h2>A shared decision, taking shape.</h2>
                    {detailedProject.activity.map((a, i) => (
                      <div key={i}>
                        <Avatar
                          name={
                            a.startsWith("Priya")
                              ? "Priya Nair"
                              : a.startsWith("Arjun")
                                ? "Arjun Mehta"
                                : "You"
                          }
                        />
                        <span>
                          {a}
                          <small>
                            {i === 0 ? "Latest update" : "Earlier"} · Demo
                            workspace
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {page === "crops" && (
          <div className="content-page">
            <div className="page-heading">
              <div>
                <div className="eyebrow">A WORLD OF GROWING POSSIBILITIES</div>
                <h1>
                  Crop library
                </h1>
                <p>
                  Start with the crop. Understand what it needs. Find where it
                  could thrive.
                </p>
              </div>
              <span className="pill neutral">6 demonstration crops</span>
            </div>
            <div className="content-toolbar">
              <div className="segmented">
                {["All crops", "Cereal", "Oilseed", "Fibre"].map((c) => (
                  <button
                    key={c}
                    className={cropCategory === c ? "active" : ""}
                    onClick={() => setCropCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="toolbar-end"><FilterSelect label="Sort crops" value={cropSort} onChange={setCropSort} options={[{value:"name",label:"Name A–Z"},{value:"season",label:"Growing season"}]} /><SearchField label="Search crops" value={search} onChange={setSearch} /></div>
            </div>
            <div className="results-caption" role="status">{visibleCrops.length} of {db.crops.length} crops · Select a crop to view requirements and explore locations</div>
            {!visibleCrops.length && <NoResults subject="crops" onReset={() => { setSearch(""); setCropCategory("All crops"); }} />}
            <div className="crop-grid">
              {visibleCrops
                .map((c) => (
                  <article
                    className={"crop-library-card crop-" + c.id}
                    key={c.id}
                  >
                    <div className="crop-card-top">
                      <span className="crop-illustration">
                        {cropEmoji[c.id]}
                      </span>
                      <span className="pill neutral">{c.category}</span>
                    </div>
                    <h2>{c.name}</h2>
                    <em>{c.scientificName}</em>
                    <p>{c.description}</p>
                    <div className="crop-requirements">
                      <span>
                        <CloudSun size={14} />
                        {c.temperature.join("–")} °C
                      </span>
                      <span>
                        <Droplets size={14} />
                        {c.rainfall.join("–")} mm
                      </span>
                    </div>
                    <div className="crop-card-bottom">
                      <button
                        className="text-button"
                        onClick={() => {
                          setCropDetail(c.id);
                          setModal("crop");
                        }}
                      >
                        Crop profile
                        <ArrowUpRight size={14} />
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => {
                          setContext({
                            ...context,
                            crop: c.id,
                            season: c.season,
                          });
                          setMode("land");
                          setSelected(null);
                          setPage("explore");
                        }}
                      >
                        Find land
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </article>
                ))}
            </div>
            <div className="inline-note library-note">
              <Info size={17} />
              <span>
                Illustrative species-level profiles. Variety and hybrid
                performance need local trial evidence. FloraKB production data
                is not connected.
              </span>
            </div>
          </div>
        )}

        {page === "evidence" && (
          <div className="content-page">
            <div className="page-heading">
              <div>
                <div className="eyebrow">GROUND YOUR THINKING IN EVIDENCE</div>
                <h1>
                  Evidence library
                </h1>
                <p>
                  Bring local observations, trial results and soil tests into
                  your team’s decisions.
                </p>
              </div>
              <button className="button primary" onClick={openEvidence}>
                <Plus size={15} />
                Add evidence
              </button>
            </div>
            <SummaryStrip items={[
              {label:"Evidence records",value:evidence.length,icon:Database},
              {label:"Locations covered",value:new Set(evidence.map((e) => e.locationId)).size,icon:MapPin},
              {label:"Crops covered",value:new Set(evidence.map((e) => e.cropId)).size,icon:Leaf},
              {label:"With observed yields",value:evidence.filter((e) => e.yield !== undefined).length,icon:CheckCircle2},
            ]} />
            <div className="evidence-banner">
              <span className="source-icon">
                <FlaskConical size={25} />
              </span>
              <div>
                <h3>Better evidence. A more grounded decision.</h3>
                <p>
                  Keep modelled estimates and team observations distinct.
                  Attaching evidence does not retrain or validate the demo
                  model.
                </p>
              </div>
              <span className="pill neutral">Prototype workspace</span>
            </div>
            <div className="content-toolbar">
              <h2>
                Team evidence <span className="muted">{visibleEvidence.length}</span>
              </h2>
              <div className="toolbar-end"><FilterSelect label="Evidence type" value={evidenceType} onChange={setEvidenceType} options={[{value:"all",label:"All evidence types"},...Array.from(new Set(evidence.map((e) => e.type))).map((type) => ({value:type,label:type}))]} /><FilterSelect label="Evidence crop" value={evidenceCrop} onChange={setEvidenceCrop} options={[{value:"all",label:"All crops"},...db.crops.map((c) => ({value:c.id,label:c.name}))]} /><SearchField label="Search evidence" value={search} onChange={setSearch} /></div>
              <button
                className="button secondary"
                onClick={() => {
                  download(
                    "croplocator-evidence.csv",
                    csv(visibleEvidence as unknown as Record<string, unknown>[]),
                    "text/csv",
                  );
                  notify("Team evidence exported.");
                }}
              >
                <Download size={15} />
                Export
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Evidence</th>
                    <th>Location / crop</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Provenance</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!visibleEvidence.length && <tr><td colSpan={6}><NoResults subject="evidence records" onReset={() => { setSearch(""); setEvidenceType("all"); setEvidenceCrop("all"); }} /></td></tr>}
                  {visibleEvidence
                    .map((e) => (
                      <tr key={e.id}>
                        <td>
                          <strong>{e.name}</strong>
                          <small className="evidence-note">{e.note}</small>
                          {e.yield && (
                            <small>{e.yield} t/ha · entered observation</small>
                          )}
                        </td>
                        <td>
                          <button
                            className="table-link"
                            onClick={() => {
                              setContext({
                                ...defaultContext,
                                crop: e.cropId,
                                region: getSite(e.locationId).region,
                                season: getCrop(e.cropId).season,
                              });
                              setSelected(e.locationId);
                              setPage("explore");
                            }}
                          >
                            {getSite(e.locationId).name}
                            <ArrowUpRight size={12} />
                          </button>
                          <small>{getCrop(e.cropId).name}</small>
                        </td>
                        <td>
                          <span className="pill neutral">{e.type}</span>
                        </td>
                        <td>{e.date}</td>
                        <td>
                          <span className="pill amber">
                            Team supplied · demo
                          </span>
                          <small>{e.fileName || "Manual entry"}</small>
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`Remove evidence ${e.name}`}
                            onClick={() => {
                              setEvidence(
                                evidence.filter((x) => x.id !== e.id),
                              );
                              notify(
                                "Evidence removed from the demo workspace.",
                              );
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="method-card">
              <div>
                <h3>Understand the model behind the map.</h3>
                <p>
                  Resolution, time periods, confidence, source types and known
                  limitations.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() => setModal("data")}
              >
                Data & methodology
                <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        )}

        {page === "team" && (
          <div className="content-page team-page">
            <div className="page-heading">
              <div>
                <div className="eyebrow">GROW BETTER, TOGETHER</div>
                <h1>
                  Your team
                </h1>
                <p>
                  Give the right people the right context, with clear roles and
                  project access.
                </p>
              </div>
              <button
                className="button primary"
                onClick={() => {
                  setFormEmail("");
                  setFormScope("All projects");
                  setModal("invite");
                }}
              >
                <Plus size={15} />
                Invite teammate
              </button>
            </div>
            <div className="team-workspace-card">
              <span className="workspace-icon large">{workspace[0]}</span>
              <div>
                <h2>{workspace}</h2>
                <p>
                  {members.filter((m) => m.status === "Active").length} active
                  members · {projects.length} projects
                </p>
              </div>
              <div>
                <span className="pill green">
                  <Shield size={12} />
                  Private workspace
                </span>
                <small>Demo access settings</small>
              </div>
            </div>
            <div className="content-toolbar">
              <h2>
                People <span className="muted">{visibleMembers.length}</span>
              </h2>
              <div className="toolbar-end"><FilterSelect label="Team role" value={teamRole} onChange={setTeamRole} options={[{value:"all",label:"All roles"},...["Owner","Admin","Analyst","Viewer"].map((role) => ({value:role,label:role}))]} /><FilterSelect label="Member status" value={teamStatus} onChange={setTeamStatus} options={[{value:"all",label:"All statuses"},{value:"Active",label:"Active"},{value:"Pending",label:"Pending"}]} /><SearchField label="Search team" value={search} onChange={setSearch} /></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Team member</th>
                    <th>Role</th>
                    <th>Project access</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!visibleMembers.length && <tr><td colSpan={5}><NoResults subject="team members" onReset={() => { setSearch(""); setTeamRole("all"); setTeamStatus("all"); }} /></td></tr>}
                  {visibleMembers
                    .map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div className="member-name">
                            <Avatar name={m.name} color={m.color} size={36} />
                            <div>
                              <strong>{m.name}</strong>
                              <small>{m.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {m.role === "Owner" ? (
                            <span className="pill neutral">Owner</span>
                          ) : (
                            <SearchSelect
                              className="table-select"
                              aria-label={`Role for ${m.name}`}
                              value={m.role}
                              onChange={(e) => {
                                setMembers((ms) =>
                                  ms.map((x) =>
                                    x.id === m.id
                                      ? {
                                          ...x,
                                          role: e.target.value,
                                          scope:
                                            e.target.value === "Admin"
                                              ? "All projects"
                                              : x.scope,
                                        }
                                      : x,
                                  ),
                                );
                                notify("Demo role updated.");
                              }}
                            >
                              {["Admin", "Analyst", "Viewer"].map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </SearchSelect>
                          )}
                        </td>
                        <td>
                          {m.role === "Owner" ? (
                            "All projects"
                          ) : (
                            <SearchSelect
                              className="table-select scope-select"
                              disabled={m.role === "Admin"}
                              aria-label={`Project access for ${m.name}`}
                              value={m.scope}
                              onChange={(e) => {
                                setMembers((ms) =>
                                  ms.map((x) =>
                                    x.id === m.id
                                      ? { ...x, scope: e.target.value }
                                      : x,
                                  ),
                                );
                                notify("Demo project access updated.");
                              }}
                            >
                              <option>All projects</option>
                              {projects.map((p) => (
                                <option value={p.id} key={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </SearchSelect>
                          )}
                        </td>
                        <td>
                          <span
                            className={
                              "pill " +
                              (m.status === "Active" ? "green" : "amber")
                            }
                          >
                            <span className="status-dot" />
                            {m.status}
                          </span>
                        </td>
                        <td>
                          {m.role !== "Owner" && (
                            <button
                              className="icon-button"
                              title={
                                m.status === "Pending"
                                  ? "Cancel invitation"
                                  : "Remove demo member"
                              }
                              aria-label={`Remove ${m.name}`}
                              onClick={() => {
                                setMembers((ms) =>
                                  ms.filter((x) => x.id !== m.id),
                                );
                                notify(
                                  m.status === "Pending"
                                    ? "Demo invitation cancelled."
                                    : "Demo member removed.",
                                );
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="roles-grid">
              {[
                {
                  role: "Admin",
                  icon: Shield,
                  text: "Manage the workspace, team and all projects.",
                },
                {
                  role: "Analyst",
                  icon: Compass,
                  text: "Explore, compare and edit projects within their access scope.",
                },
                {
                  role: "Viewer",
                  icon: Users,
                  text: "View shared projects, scenarios and attached evidence.",
                },
              ].map((r) => (
                <div key={r.role}>
                  <r.icon size={20} />
                  <h3>{r.role}</h3>
                  <p>{r.text}</p>
                </div>
              ))}
            </div>
            <div className="inline-note">
              <Info size={16} />
              <span>
                Roles, access and invitations are simulated in this browser. No
                email is sent, and no authentication or server-side permission
                enforcement is connected.
              </span>
            </div>
          </div>
        )}
      </main>

      {modal === "preferences" && (
        <Modal title="Workspace preferences" subtitle="Personalise this workspace. Changes are saved in this browser." onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); if (!preferencesName.trim()) return; setWorkspace(preferencesName.trim()); setModal(null); notify("Workspace preferences saved."); }}>
            <label>Workspace name<input autoFocus required maxLength={70} value={preferencesName} onChange={(e) => setPreferencesName(e.target.value)} /></label>
            <fieldset className="preference-options"><legend>Display density</legend><p>Choose the amount of space around cards, tables and controls.</p><div className="choice-row">{["comfortable","compact"].map((value) => <button key={value} type="button" aria-pressed={density === value} className={density === value ? "selected" : ""} onClick={() => setDensity(value)}>{value === "comfortable" ? <LayoutGrid size={18} /> : <List size={18} />} {value === "comfortable" ? "Comfortable" : "Compact"}{density === value && <Check size={16} />}</button>)}</div></fieldset>
            <div className="preference-note"><Shield size={18} /><span>Workspace data stays in this browser. Display preferences apply immediately.</span></div>
            <div className="modal-footer"><button type="button" className="button secondary" onClick={() => setModal(null)}>Close</button><button className="button primary" disabled={!preferencesName.trim()}>Save workspace name<Check size={15} /></button></div>
          </form>
        </Modal>
      )}
      {modal === "project" && (
        <Modal
          title="Create a project"
          subtitle="Start simple. Add locations, scenarios and teammates as you go."
          onClose={() => setModal(null)}
        >
          <form onSubmit={createProject}>
            <label>
              Project name
              <input
                required
                autoFocus
                maxLength={90}
                placeholder="e.g. Cotton sourcing · 2027"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </label>
            <label>
              Decision objective
              <SearchSelect
                value={formGoal}
                onChange={(e) => setFormGoal(e.target.value)}
              >
                {[
                  "Source a crop",
                  "Plan seed trials",
                  "Choose crops for land",
                  "Assess portfolio risk",
                  "Explore a new market",
                  "Research environments",
                ].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </SearchSelect>
            </label>
            <label>
              A little context <span className="muted">(optional)</span>
              <textarea
                placeholder="What would a good outcome look like?"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </label>
            <div className="form-context">
              <Leaf size={15} />
              {getCrop(context.crop).name}
              <MapPin size={15} />
              {context.region}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button className="button primary">
                Create project
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {(modal === "save" || modal === "switch-project") && (
        <Modal
          title={
            modal === "save"
              ? "Save candidate to a project"
              : "Choose your active project"
          }
          subtitle={
            modal === "save" && selected
              ? `${getSite(selected).name} · ${getCrop(context.crop).name} · ${context.season}`
              : "New locations and saved searches will belong to this project."
          }
          onClose={() => setModal(null)}
        >
          <div className="project-picker">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSaveTarget(p.id)}
                className={saveTarget === p.id ? "selected" : ""}
              >
                <FolderOpen size={20} />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.region} · {candidates(p).length} candidates
                  </small>
                </span>
                {saveTarget === p.id && <CheckCircle2 size={18} />}
              </button>
            ))}
          </div>
          <button className="text-button" onClick={openProjectForm}>
            <Plus size={15} />
            Create a new project
          </button>
          <div className="modal-footer">
            <button className="button secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                setActiveProject(saveTarget);
                if (modal === "save" && selected) addToProject([chosenCandidate]);
                else {
                  setModal(null);
                  notify("Active project updated.");
                }
              }}
            >
              {modal === "save" ? "Save candidate" : "Use this project"}
              <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {modal === "scenario" && (
        <Modal
          title="Save a scenario"
          subtitle="Save the exact search context and selected locations to a project."
          onClose={() => setModal(null)}
        >
          <form onSubmit={saveScenario}>
            <label>
              Scenario name
              <input
                autoFocus
                required
                maxLength={100}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </label>
            <label>
              Project
              <SearchSelect
                value={saveTarget}
                onChange={(e) => setSaveTarget(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SearchSelect>
            </label>
            <div className="scenario-summary">
              <span>
                {getCrop(context.crop).name} · {context.region}
              </span>
              <span>
                {context.season} · {context.water}
              </span>
              <span>
                {db.periods.find((p) => p.id === context.period)?.range} ·{" "}
                {context.period === "baseline"
                  ? "Historical sample"
                  : context.scenario === "ssp245"
                    ? "SSP2-4.5"
                    : "SSP5-8.5"}
              </span>
              {assumptions && (
                <span>
                  Price {money(assumptions.price)}/t · Cost{" "}
                  {money(assumptions.cost)}/ha · Logistics{" "}
                  {money(assumptions.logistics)}/ha
                </span>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button className="button primary">
                Save scenario
                <Bookmark size={15} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "invite" && (
        <Modal
          title="Invite a teammate"
          subtitle="Create a simulated invitation with a clear role and project scope."
          onClose={() => setModal(null)}
        >
          <form onSubmit={invite}>
            <label>
              Work email
              <input
                required
                type="email"
                autoFocus
                placeholder="colleague@company.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                Role
                <SearchSelect
                  value={formRole}
                  onChange={(e) => {
                    setFormRole(e.target.value);
                    if (e.target.value === "Admin")
                      setFormScope("All projects");
                  }}
                >
                  <option>Analyst</option>
                  <option>Viewer</option>
                  <option>Admin</option>
                </SearchSelect>
              </label>
              <label>
                Project access
                <SearchSelect
                  disabled={formRole === "Admin"}
                  value={formScope}
                  onChange={(e) => setFormScope(e.target.value)}
                >
                  <option>All projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </SearchSelect>
              </label>
            </div>
            <div className="role-explainer">
              <Shield size={19} />
              <p>
                {formRole === "Admin"
                  ? "Admins manage the team and workspace. In a connected product, admin rights should grant workspace-wide access."
                  : formRole === "Analyst"
                    ? "Analysts can explore, compare and edit projects within their access scope."
                    : "Viewers can read shared projects, scenarios and evidence."}
              </p>
            </div>
            <div className="inline-note">
              <Info size={16} />
              <span>
                This creates a pending invitation in this browser. No email is
                sent.
              </span>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button className="button primary">
                Create demo invitation
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "evidence" && (
        <Modal
          title="Add evidence"
          subtitle="Attach a local observation to a crop and location. Keep its provenance clear."
          onClose={() => setModal(null)}
        >
          <form onSubmit={addEvidence}>
            <label>
              Evidence name
              <input
                required
                autoFocus
                placeholder="e.g. Jalgaon soil test · October"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                Location
                <SearchSelect
                  value={formSite}
                  onChange={(e) => setFormSite(e.target.value)}
                >
                  {db.locations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </SearchSelect>
              </label>
              <label>
                Crop
                <SearchSelect
                  value={formCrop}
                  onChange={(e) => setFormCrop(e.target.value)}
                >
                  {db.crops.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </SearchSelect>
              </label>
              <label>
                Evidence type
                <SearchSelect
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                >
                  {[
                    "Field note",
                    "Soil test",
                    "Field trial",
                    "Yield observation",
                    "Commercial quote",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </SearchSelect>
              </label>
              <label>
                Observation date
                <input
                  required
                  type="date"
                  max="2026-11-07"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </label>
            </div>
            <label>
              What did you observe?
              <textarea
                required={!fileRows.length}
                placeholder="Include the method, source, sample size and limitations."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </label>
            <label>
              Observed yield, t/ha <span className="muted">(optional)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formYield}
                onChange={(e) => setFormYield(e.target.value)}
              />
            </label>
            <label className="file-upload">
              <Upload size={20} />
              <span>
                {fileName || "Or import evidence from CSV"}
                <small>
                  name, locationId, cropId, date, note, yield · up to 2 MB
                </small>
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) =>
                  e.target.files?.[0] && readCsv(e.target.files[0])
                }
              />
            </label>
            {fileError && <p className="form-error">{fileError}</p>}
            {fileRows.length > 0 && (
              <p className="form-success">
                <CheckCircle2 size={14} />
                {fileRows.length} valid records ready to import
              </p>
            )}
            <button
              type="button"
              className="text-button"
              onClick={() =>
                download(
                  "evidence-template.csv",
                  'name,locationId,cropId,date,note,yield\n"Jalgaon trial",jalgaon,cotton,2026-10-24,"12 plot demo trial; local verification needed",2.6',
                  "text/csv",
                )
              }
            >
              <Download size={13} />
              Download CSV template
            </button>
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={!!fileError}>
                Add{" "}
                {fileRows.length > 0
                  ? fileRows.length + " records"
                  : "evidence"}
                <Plus size={15} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "command" && (
        <Modal
          title="Search your workspace"
          onClose={() => setModal(null)}
        >
          <CommandMenu query={commandQuery} onQuery={setCommandQuery} items={[
              {
                label: "Explore the map",
                sub: "Workspace",
                icon: Compass,
                action: () => navigate("explore"),
              },
              {
                label: "Create a project",
                sub: "Action",
                icon: Plus,
                action: openProjectForm,
              },
              {
                label: "Invite a teammate",
                sub: "Action",
                icon: Users,
                action: () => {
                  setFormEmail("");
                  setModal("invite");
                },
              },
              {
                label: "Add evidence",
                sub: "Action",
                icon: Database,
                action: openEvidence,
              },
              ...navItems.filter((n) => n.id !== "explore").map((n) => ({label:n.label,sub:"Page",icon:n.icon,action:() => navigate(n.id)})),
              {label:"Workspace preferences",sub:"Settings",icon:Settings,action:openPreferences},
              ...projects.map((p) => ({
                label: p.name,
                sub: "Project",
                icon: FolderOpen,
                action: () => {
                  setProjectDetail(p.id);
                  setActiveProject(p.id);
                  setPage("projects");
                  setModal(null);
                },
              })),
              ...db.crops.map((c) => ({
                label: c.name,
                sub: "Crop",
                icon: Leaf,
                action: () => {
                  setCropDetail(c.id);
                  setModal("crop");
                },
              })),
              ...db.locations.map((s) => ({
                label: s.name,
                sub: `${s.region} · ${s.country} · Location`,
                icon: MapPin,
                action: () => {
                  setContext({ ...context, region: s.region });
                  setSelected(s.id);
                  setPage("explore");
                  setModal(null);
                },
              })),
            ]} />
        </Modal>
      )}
      {modal === "crop" && (
        <Modal
          title={getCrop(cropDetail).name}
          subtitle={getCrop(cropDetail).scientificName}
          onClose={() => setModal(null)}
        >
          <div className="crop-profile-hero">
            <span>{cropEmoji[cropDetail]}</span>
            <p>{getCrop(cropDetail).description}</p>
          </div>
          <dl className="data-list">
            <div>
              <dt>Category</dt>
              <dd>{getCrop(cropDetail).category}</dd>
            </div>
            <div>
              <dt>Primary demo season</dt>
              <dd>{getCrop(cropDetail).season}</dd>
            </div>
            <div>
              <dt>Temperature screening range</dt>
              <dd>{getCrop(cropDetail).temperature.join("–")} °C</dd>
            </div>
            <div>
              <dt>Annual rainfall screening range</dt>
              <dd>{getCrop(cropDetail).rainfall.join("–")} mm</dd>
            </div>
            <div>
              <dt>Soil pH screening range</dt>
              <dd>{getCrop(cropDetail).ph.join("–")}</dd>
            </div>
          </dl>
          <div className="inline-note">
            <Info size={16} />
            <span>
              Illustrative species requirements. This profile does not establish
              the performance of a specific variety or hybrid.
            </span>
          </div>
          <div className="modal-footer">
            <button className="button secondary" onClick={() => setModal(null)}>
              Close profile
            </button>
            <button
              className="button primary"
              onClick={() => {
                setContext({
                  ...context,
                  crop: cropDetail,
                  season: getCrop(cropDetail).season,
                });
                setMode("land");
                setPage("explore");
                setSelected(null);
                setModal(null);
              }}
            >
              Find land for {getCrop(cropDetail).name}
              <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {modal === "data" && (
        <Modal
          title="Clear about what’s beneath the map."
          subtitle="Data, resolution and the limits of this prototype."
          onClose={() => setModal(null)}
          wide
        >
          <div className="data-explainer">
            <section>
              <h3>A connected mock dataset</h3>
              <div className="data-stats">
                {[
                  [String(db.crops.length), "Crops"],
                  [String(db.cells.length), "1 km cells"],
                  [String(db.aezs.length), "AEZ classes"],
                  [db.meta.synthetic ? "155,520" : "", "Observations"],
                ].map(([n, t]) => (
                  <div key={t}>
                    <strong>{n}</strong>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <p>
                Each observation maps a crop to a spatial cell, a climate
                period, an emissions scenario, a season and a water regime.
                Rankings aggregate 36 cells in each of 24 sampled locations
                across 10 countries. Growing-origin references are documented at
                country level; sample suitability scores remain synthetic.
              </p>
              <h3>What an AEZ means</h3>
              <p>
                AEZ classes group comparable environments. Their colours
                identify classes and do not indicate suitability. The demo
                assignments are synthetic and do not reproduce SBSF’s
                classification.
              </p>
              <h3>What 1 km means here</h3>
              <p>
                Cells approximate 1 × 1 km in local latitude/longitude. They are
                illustrative sample patches, not full district coverage or
                measured field boundaries. SBSF’s leaflets describe a production
                9 × 9 km grid, with 1 × 1 km under development.
              </p>
            </section>
            <section>
              <h3>What is synthetic</h3>
              <p>
                Every numerical value, AEZ assignment, processor count, cost,
                yield and risk index in this prototype. FloraKB, weather feeds,
                farm systems and live markets are not connected. Team evidence
                stays separate from the model.
              </p>
              <h3>Time & uncertainty</h3>
              <p>
                Baseline: 2021–2025. 2030s: 2026–2045. 2050s: 2046–2065. Future
                values are illustrative scenario averages, not forecasts.
                Confidence is a demo index, not a statistical probability.
              </p>
              <h3>How this workspace works</h3>
              <p>
                Projects, notes, invitations and evidence are stored in this
                browser. Team roles are a product mockup; they do not enforce
                access. Local changes are not shared across devices.
              </p>
              <External href="https://www.fao.org/gaez/en">
                Read about FAO GAEZ
              </External>
              <p className="caption">
                FAO is a research reference, not the source of this mock data.
              </p>
            </section>
          </div>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => {
                const a = document.createElement("a");
                a.href = "/data/mock-db.json.gz";
                a.download = "croplocator-mock-db.json.gz";
                a.click();
                notify("Full synthetic JSON database download started.");
              }}
            >
              <Download size={15} />
              Download mock database · compressed JSON
            </button>
            <button className="button primary" onClick={() => setModal(null)}>
              Back to exploring
              <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="Help & getting started"
          subtitle="A few simple steps from exploration to a shared decision."
          onClose={() => setModal(null)}
        >
          <div className="help-steps">
            {[
              [
                "01",
                "Set your question",
                "Choose Find land or Find crops, then select geography, season and water regime.",
              ],
              [
                "02",
                "Follow the map",
                "Open a location, inspect fit and reveal climate, soil or economics when needed.",
              ],
              [
                "03",
                "Get some perspective",
                "Add up to three candidates to compare. Use time travel to test future conditions.",
              ],
              [
                "04",
                "Make it a project",
                "Save candidates, attach evidence, invite your team and record the reasoning.",
              ],
            ].map(([n, t, p]) => (
              <div key={n}>
                <b>{n}</b>
                <span>
                  <strong>{t}</strong>
                  <p>{p}</p>
                </span>
              </div>
            ))}
          </div>
          <div className="shortcut-reference"><span><kbd>⌘ / Ctrl K</kbd> Search workspace</span><span><kbd>⌘ / Ctrl Z</kbd> Undo</span><span><kbd>⌘ / Ctrl Shift Z</kbd> Redo</span><span><kbd>Esc</kbd> Close dialog or popover</span></div>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => {
                setModal(null);
                setOnboarded(false);
              }}
            >
              Replay onboarding
            </button>
            <button className="button primary" onClick={() => setModal(null)}>
              Let’s explore
              <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
