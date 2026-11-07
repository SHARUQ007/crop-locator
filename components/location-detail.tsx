"use client";
import TabInsight from "./tab-insight";
import CropHealth from "./crop-health";
import CropResults from "./crop-results";
import SearchSelect from "./search-select";
import { ResearchIntelligence, SoilDistributions } from "./research-intelligence";
import { useState, useId } from "react";
import {
  X,
  Bookmark,
  Check,
  GitCompareArrows,
  ArrowRight,
  MapPin,
  Info,
  ChevronDown,
  ChevronUp,
  Droplets,
  Sun,
  ExternalLink,
  FileCheck2,
  Plus,
  Maximize2,
  ArrowUpRight,
  FlaskConical,
  RotateCcw,
} from "lucide-react";
import { SearchField } from "./workspace-ui";
import { matchesSearch } from "../lib/search";
import { practiceGuides } from "../lib/growing-practices";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  db,
  Context,
  Site,
  Evidence,
  getRecord,
  getCrop,
  fitLabel,
  money,
} from "../lib/model";
export default function LocationDetail({
  site,
  context,
  cellId,
  evidence,
  saved,
  compared,
  onClose,
  onSave,
  onCompare,
  onZoom,
  onEvidence,
  onScenario,
  onContext,
  cellObservation,
  initialAssumptions,
  onAnalogues,
  cropOpportunities = false,
  onCompareCrop,
  comparedCrops = [],
}: {
  onAnalogues: () => void;
  cropOpportunities?: boolean;
  onCompareCrop?: (cropId: string) => void;
  comparedCrops?: string[];
  cellObservation?: Record<string, any>;
  initialAssumptions?: { price: number; cost: number; logistics: number };
  site: Site;
  context: Context;
  cellId: string | null;
  evidence: Evidence[];
  saved: boolean;
  compared: boolean;
  onClose: () => void;
  onSave: () => void;
  onCompare: () => void;
  onZoom: () => void;
  onEvidence: () => void;
  onScenario: (assumptions?: {
    price: number;
    cost: number;
    logistics: number;
  }) => void;
  onContext: (c: Context) => void;
}) {
  const initialO = getRecord(site.id, context);
  const [tab, setTab] = useState(initialAssumptions ? "Economics" : "Overview"),
    [climateMetric, setClimateMetric] = useState("Rainfall"),
    [priceDelta, setPriceDelta] = useState(
      initialAssumptions
        ? Math.round(
            (initialAssumptions.price / initialO.priceINRTonne - 1) * 100,
          )
        : 0,
    ),
    [costDelta, setCostDelta] = useState(
      initialAssumptions
        ? Math.round(
            (initialAssumptions.cost / initialO.inputCostINRHa - 1) * 100,
          )
        : 0,
    ),
    [logistics, setLogistics] = useState(initialAssumptions?.logistics ?? 6500),
    [showAll, setShowAll] = useState(false),
    [cropSearch, setCropSearch] = useState(""),
    [opportunitySort, setOpportunitySort] = useState("fit");
  const tabId = useId();
  const o = { ...getRecord(site.id, context), ...(cellObservation || {}) },
    crop = getCrop(context.crop),
    aez = db.aezs.find((a) => a.id === site.aezId)!;
  const cells = db.cells.filter((c) => c.locationId === site.id),
    cell = cells.find((c) => c.id === cellId),
    soil = cell?.soil || {
      ph: +(cells.reduce((a, c) => a + c.soil.ph, 0) / cells.length).toFixed(1),
      clay: cells.reduce((a, c) => a + c.soil.clay, 0) / cells.length,
      sand: cells.reduce((a, c) => a + c.soil.sand, 0) / cells.length,
      organicCarbon:
        cells.reduce((a, c) => a + c.soil.organicCarbon, 0) / cells.length,
      bulkDensity:
        cells.reduce((a, c) => a + c.soil.bulkDensity, 0) / cells.length,
    };
  const factors = [
    {
      name: "Soil compatibility",
      score: Math.min(97, Math.round(o.suitability + 4)),
    },
    {
      name: "Temperature fit",
      score: Math.min(97, Math.round(o.suitability + 1)),
    },
    { name: "Rainfall alignment", score: Math.round(o.suitability - 8) },
    {
      name: "Terrain & drainage",
      score: Math.min(97, Math.round(o.suitability - 2)),
    },
  ];
  const baseWeights = [
    0.008, 0.006, 0.01, 0.012, 0.027, 0.15, 0.25, 0.23, 0.17, 0.09, 0.03, 0.017,
  ];
  const monthWeights =
    site.center[0] < 0
      ? [...baseWeights.slice(6), ...baseWeights.slice(0, 6)]
      : baseWeights;
  const monthly = monthWeights.map((v, i) => ({
    month: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][i],
    rainfall: Math.round(o.annualRainfallMm * v),
    temperature: +(
      o.meanTemperatureC + [-4, -2, 1, 4, 5, 2, 0, -1, -1, 0, -2, -4][i]
    ).toFixed(1),
  }));
  const price = o.priceINRTonne * (1 + priceDelta / 100),
    cost = o.inputCostINRHa * (1 + costDelta / 100),
    margin = o.yieldTHa * price - cost - logistics;
  const relevant = evidence.filter(
    (e) => e.locationId === site.id && e.cropId === context.crop,
  );
  const opportunities=db.crops.map(item=>({name:item.name,score:getRecord(site.id,context,item.id).suitability})).sort((a,b)=>b.score-a.score);
  const exposure=(value:number)=>value>=60?'high':value>=30?'moderate':'low';
  const insight:Record<string,string>={
    Overview:`${crop.name} screens as ${fitLabel(o.suitability).toLowerCase()} here, with ${exposure(o.droughtRisk)} drought exposure. ${relevant.length?'Use the attached evidence to validate local performance.':'Local field evidence is the next gap to close.'}`,
    'Crop intelligence':`${opportunities[0].name} leads this location’s species screening at ${opportunities[0].score.toFixed(0)}/100. Compare water needs and crop-product economics before shortlisting alternatives.`,
    'Decision tools':`The current model yields ${o.yieldRange.join('–')} t/ha for ${crop.name.toLowerCase()}. Test future exposure, supply volumes or transition costs against your decision.`,
    'Growing context':`The sample growing window is ${site.growingWindow}. Align variety, planting and harvest plans with local practices before using this window operationally.`,
    Climate:`The selected context has ${exposure(o.droughtRisk)} drought and ${exposure(o.heatRisk)} heat exposure. Annual averages of ${Math.round(o.annualRainfallMm)} mm rainfall and ${o.meanTemperatureC.toFixed(1)} °C can hide seasonal extremes.`,
    Soil:`Sample mean pH is ${soil.ph.toFixed(1)}, with ${soil.clay.toFixed(0)}% clay and ${soil.organicCarbon.toFixed(2)}% organic carbon. Check variation across cells and validate with a recent soil test.`,
    'Pests & diseases':`Use the crop-specific watchlist to plan scouting. Local pest presence and disease incidence have not been assessed for ${site.name}.`,
    Economics:`At the current price and cost assumptions, gross margin is ${money(margin)}/ha. ${margin<0?'The scenario is below operating break-even.':'Test downside prices and yield before committing capital.'}`,
    Evidence:`${relevant.length} team ${relevant.length===1?'record is':'records are'} attached for this crop and location. ${relevant.some(item=>item.yield!==undefined)?'Measured yields are available to benchmark the model.':'Measured yield evidence is still needed to benchmark field performance.'}`,
  };
  return (
    <aside className="detail-panel intelligence-panel">
      <div className="detail-top">
        <span className="eyebrow">LOCATION INTELLIGENCE</span>
        <a className="text-button back-to-map" href="#explore-map">
          Back to map ↑
        </a>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close location details"
        >
          <X size={18} />
        </button>
      </div>
      <div className="detail-heading">
        <div>
          <h2>
            {site.name}
            <span>, {site.country}</span>
          </h2>
          <p>
            <MapPin size={12} />
            {site.region} <span>·</span> {aez.id}
          </p>
        </div>
        <button
          className="icon-button bordered"
          title="Locate this sample area on the map"
          onClick={onZoom}
        >
          <Maximize2 size={16} />
        </button>
      </div>
      {cell && (
        <div className="cell-chip">
          1 km cell · {cell.id}
          <button onClick={onZoom} className="text-button">
            Locate
          </button>
        </div>
      )}
      <div className="detail-context">
        <label className="intelligence-crop-context"><span>Analysing</span><SearchSelect aria-label="Intelligence crop" value={context.crop} onChange={event=>onContext({...context,crop:event.target.value})}>{db.crops.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</SearchSelect></label>
        <span>·</span>
        {context.season}
        <span>·</span>
        {db.periods.find((p) => p.id === context.period)?.range}
      </div>
      <div className="intelligence-layout">
      <div className="detail-tabs intelligence-nav" role="tablist" aria-orientation="vertical" aria-label="Location intelligence sections">
        {[
          "Overview",
          "Crop intelligence",
          "Decision tools",
          "Growing context",
          "Climate",
          "Soil",
          "Pests & diseases",
          "Economics",
          "Evidence",
        ].map((t) => (
          <button
            key={t}
            role="tab"
            id={`${tabId}-${t.replaceAll(" ","-")}`}
            aria-selected={tab === t}
            aria-controls={`${tabId}-panel`}
            tabIndex={tab === t ? 0 : -1}
            onKeyDown={(event) => {
              const tabs = Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>("[role='tab']"));
              let index = tabs.indexOf(event.currentTarget);
              if (event.key === "ArrowRight" || event.key === "ArrowDown") index = (index + 1) % tabs.length;
              else if (event.key === "ArrowLeft" || event.key === "ArrowUp") index = (index - 1 + tabs.length) % tabs.length;
              else if (event.key === "Home") index = 0;
              else if (event.key === "End") index = tabs.length - 1;
              else return;
              event.preventDefault(); tabs[index].click(); tabs[index].focus();
            }}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            <span className="intelligence-nav-label">{t}<small>{{Overview:"Decision summary", "Crop intelligence":"Rank & shortlist crops", "Decision tools":"Supply, resilience & trials", "Growing context":"Origins & growing practices", Climate:"Seasonality & exposure", Soil:"Conditions & variation", "Pests & diseases":"Scouting & field evidence", Economics:"Test price & cost assumptions", Evidence:"Records & methodology"}[t]}</small></span>
            {t === "Evidence" && relevant.length > 0 && (
              <i>{relevant.length}</i>
            )}
          </button>
        ))}
      </div>
      <div className="detail-body" data-tab={tab} key={site.id + tab} role="tabpanel" id={`${tabId}-panel`} aria-labelledby={`${tabId}-${tab.replaceAll(" ","-")}`}>
      {tab === "Crop intelligence" && (
        <section className="crop-opportunities" aria-label="Crop opportunities">
          <div className="opportunity-heading"><div><h3>Crop opportunities</h3><TabInsight>{insight["Crop intelligence"]}</TabInsight></div><span>Synthetic screening</span></div>
          <div className="crop-screening-requirements"><div><span>Selected crop</span><strong>{crop.name}</strong><small>{crop.scientificName}</small></div><div><span>Temperature range</span><strong>{crop.temperature.join("–")} °C</strong><small>Species screening envelope</small></div><div><span>Annual rainfall</span><strong>{crop.rainfall.join("–")} mm</strong><small>Screen against water availability</small></div><div><span>Soil pH range</span><strong>{crop.ph.join("–")}</strong><small>Confirm with a field test</small></div></div>
          <div className="opportunity-toolbar"><SearchField label="Search crop opportunities" value={cropSearch} onChange={setCropSearch} placeholder="Search all screened crops…" /><label>Sort by<SearchSelect aria-label="Sort crop opportunities" value={opportunitySort} onChange={(e) => setOpportunitySort(e.target.value)}><option value="fit">Environmental fit</option><option value="margin">Illustrative margin / ha</option><option value="water">Lowest drought risk</option></SearchSelect></label></div>
          <div className="crop-candidate-grid"><CropResults site={site} context={context} evidence={evidence} compared={comparedCrops}
            items={db.crops.map(candidate=>({crop:candidate,record:getRecord(site.id,context,candidate.id)})).filter(({crop})=>matchesSearch(crop.name+" "+crop.category,cropSearch)).sort((a,b)=>opportunitySort==="water"?a.record.droughtRisk-b.record.droughtRisk:opportunitySort==="margin"?(b.record.yieldTHa*b.record.priceINRTonne-b.record.inputCostINRHa)-(a.record.yieldTHa*a.record.priceINRTonne-a.record.inputCostINRHa):b.record.suitability-a.record.suitability)}
            onSelect={cropId=>onContext({...context,crop:cropId})} onView={cropId=>{onContext({...context,crop:cropId});setTab("Overview");}} onCompare={cropId=>onCompareCrop?.(cropId)} /></div>
          {!db.crops.some((crop) => matchesSearch(crop.name + " " + crop.category, cropSearch)) && <div className="search-empty"><h3>No crops match “{cropSearch}”</h3><button className="button secondary" onClick={() => setCropSearch("")}>Clear search</button></div>}
        </section>
      )}
        {tab === "Pests & diseases" && <CropHealth summary={insight["Pests & diseases"]} site={site} context={context} evidence={evidence} onEvidence={onEvidence}/> }
        {tab === "Decision tools" && <ResearchIntelligence site={site} context={context} onContext={onContext} evidence={evidence} onEvidence={onEvidence} onScenario={() => onScenario()} onAnalogues={onAnalogues} />}
        {tab === "Overview" && (
          <section className="intelligence-overview">
            <div className="analysis-section-heading"><span className="eyebrow">THE DECISION AT A GLANCE</span><h3>How does {crop.name.toLowerCase()} fit here?</h3><TabInsight>{insight.Overview}</TabInsight></div>
            <div className="overview-kpis">
              <article className="overview-score"><span>Environmental fit</span><strong>{Math.round(o.suitability)}<small>/100</small></strong><div className="overview-score-track"><i style={{width:o.suitability+"%"}} /></div><small>{fitLabel(o.suitability)}</small></article>
              <article><span>Potential yield</span><strong>{o.yieldRange.join("–")}<small> t/ha</small></strong><small>Illustrative range, not a forecast</small></article>
              <article><span>Drought exposure</span><strong>{Math.round(o.droughtRisk)}<small>/100</small></strong><small>{o.droughtRisk<30?"Low":o.droughtRisk<60?"Moderate":"High"} exposure · lower is preferable</small></article>
              <article><span>Team evidence</span><strong>{relevant.length}<small> records</small></strong><small>{relevant.length?"Review provenance and local relevance":"No local records attached"}</small></article>
            </div>
            <div className="overview-columns"><section className="analysis-card"><div className="analysis-card-heading"><h4>Environmental checkpoints</h4><span>Species screening</span></div>{[
              {name:"Mean temperature",value:`${o.meanTemperatureC.toFixed(1)} °C`,range:`${crop.temperature.join("–")} °C`,inside:o.meanTemperatureC>=crop.temperature[0]&&o.meanTemperatureC<=crop.temperature[1],target:"Climate"},
              {name:"Annual rainfall",value:`${Math.round(o.annualRainfallMm)} mm`,range:`${crop.rainfall.join("–")} mm`,inside:o.annualRainfallMm>=crop.rainfall[0]&&o.annualRainfallMm<=crop.rainfall[1],target:"Climate"},
              {name:"Soil pH",value:soil.ph.toFixed(1),range:crop.ph.join("–"),inside:soil.ph>=crop.ph[0]&&soil.ph<=crop.ph[1],target:"Soil"},
            ].map(item=><button className="environment-check" key={item.name} onClick={()=>setTab(item.target)}><span className={item.inside?"checkpoint-dot aligned":"checkpoint-dot"}/><span><strong>{item.name}</strong><small>Crop screening range {item.range}</small></span><span><strong>{item.value}</strong><small>{item.inside?"Within range":"Review constraint"}</small></span><ArrowRight size={14}/></button>)}<p className="analysis-footnote">Averages can conceal extremes. Review climate variation, soil distribution and management requirements.</p></section>
            <section className="analysis-card next-steps"><div className="analysis-card-heading"><h4>What to do next</h4></div><button onClick={()=>setTab("Crop intelligence")}><LeafIcon/><span><strong>Explore alternative crops</strong><small>Compare environmental fit at this location.</small></span><ArrowRight size={15}/></button><button onClick={()=>setTab("Decision tools")}><FlaskConical size={18}/><span><strong>Test a decision</strong><small>Review supply, transition costs or trial readiness.</small></span><ArrowRight size={15}/></button><button onClick={()=>setTab("Evidence")}><FileCheck2 size={18}/><span><strong>Close the evidence gaps</strong><small>Check field trials, soil tests and source limits.</small></span><ArrowRight size={15}/></button></section></div>
            <div className="analysis-provenance"><Info size={17}/><p><strong>Screening confidence: {Math.round(o.confidence)}/100.</strong> This synthetic index is not a probability. {cell?"Selected 1 km cell":`${site.cellCount} sample cells · ${site.sampledAreaHa.toLocaleString()} ha`} · species-level model · validate variety performance locally.</p></div>
          </section>
        )}
        {tab === "Growing context" && (
          <>
            <div className="section-heading">
              <h3>Learn from this growing origin</h3>
              <span className="pill neutral">Sourced context</span>
            </div>
            <TabInsight>{insight["Growing context"]}</TabInsight>
            {db.growingEvidence.find(
              (e) => e.country === site.country && e.cropId === context.crop,
            ) ? (
              <div className="growing-origin-card">
                <GlobeOrigin />
                <div>
                  <strong>
                    {site.country} is a documented cotton-growing country
                  </strong>
                  <p>
                    USDA country-level production reference. This does not
                    confirm cultivation, yields or best practice on the selected
                    1 km sample.
                  </p>
                  <a
                    href="https://fas.usda.gov/data/production/commodity/2631000"
                    target="_blank"
                    rel="noreferrer"
                  >
                    USDA growing-country reference ↗
                  </a>
                </div>
              </div>
            ) : (
              <div className="inline-note">
                <Info size={17} />
                <span>
                  No sourced cultivation record is attached for this crop here.
                  Environmental fit is a separate, synthetic screening result.
                </span>
              </div>
            )}
            <dl className="data-list">
              <div>
                <dt>Country / region</dt>
                <dd>
                  {site.country} / {site.region}
                </dd>
              </div>
              <div>
                <dt>Illustrative local growing window</dt>
                <dd>{site.growingWindow}</dd>
              </div>
              <div>
                <dt>Environmental class</dt>
                <dd>{aez.name}</dd>
              </div>
            </dl>
            <div className="section-heading">
              <h3>Practices worth investigating</h3>
              <span className="muted">Not a performance ranking</span>
            </div>
            {practiceGuides
              .filter(
                (g) =>
                  g.cropId === context.crop &&
                  (g.countries.includes(site.country) ||
                    g.countries.length === 0),
              )
              .map((g) => (
                <article className="practice-card" key={g.id}>
                  <span className="pill neutral">{g.theme}</span>
                  <h3>{g.title}</h3>
                  <p>{g.summary}</p>
                  <small>{g.scope}</small>
                  <a href={g.url} target="_blank" rel="noreferrer">
                    {g.publisher}
                    <ArrowUpRight size={14} />
                  </a>
                </article>
              ))}
            {!practiceGuides.some((g) => g.cropId === context.crop) && (
              <p className="body-muted">
                No practice guides have been added for this demo crop yet.
                Attach a local trial or extension reference as team evidence.
              </p>
            )}
            <button className="button secondary full" onClick={onAnalogues}>
              <LayersOrigin />
              Find similar AEZs worldwide
              <ArrowRight size={15} />
            </button>
            <p className="caption">
              An environmental analogue can suggest what to investigate.
              Practices still need local agronomic, water and commercial
              validation.
            </p>
          </>
        )}
        {tab === "Climate" && (
          <>
            <div className="section-heading">
              <h3>The growing environment</h3>
              <span className="pill neutral">
                {context.period === "baseline"
                  ? "Historical sample"
                  : "Projection"}
              </span>
            </div>
            <TabInsight>{insight["Climate"]}</TabInsight>
            <p className="body-muted">
              {context.period === "baseline"
                ? "A synthetic baseline for 2021–2025."
                : `An illustrative ${context.scenario === "ssp245" ? "SSP2-4.5" : "SSP5-8.5"} climate scenario. Period averages, not a seasonal forecast.`}
            </p>
            <div className="metric-pair">
              <div>
                <span>Annual rainfall</span>
                <strong>
                  {Math.round(o.annualRainfallMm)}
                  <small> mm</small>
                </strong>
              </div>
              <div>
                <span>Mean temperature</span>
                <strong>
                  {o.meanTemperatureC}
                  <small> °C</small>
                </strong>
              </div>
            </div>
            <div className="segmented small">
              {["Rainfall", "Temperature"].map((m) => (
                <button
                  key={m}
                  className={climateMetric === m ? "active" : ""}
                  onClick={() => setClimateMetric(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="chart-caption">
              Illustrative monthly profile ·{" "}
              {climateMetric === "Rainfall" ? "mm" : "°C"}
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart
                  data={monthly}
                  margin={{ left: -28, right: 5, top: 8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="#e9ece6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Bar
                    dataKey={
                      climateMetric === "Rainfall" ? "rainfall" : "temperature"
                    }
                    name={
                      climateMetric === "Rainfall"
                        ? "Rainfall (mm)"
                        : "Temperature (°C)"
                    }
                    fill={climateMetric === "Rainfall" ? "#7eaaa0" : "#c99e64"}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="caption">
              Monthly values distribute the synthetic annual mean using a fixed
              seasonal profile; they are not observed measurements.
            </p>
            <section className="detail-section">
              <h3>Exposure to watch</h3>
              {[
                ["Heat stress", o.heatRisk],
                ["Drought exposure", o.droughtRisk],
              ].map(([n, v]) => (
                <div className="risk-row" key={n}>
                  <span>{n}</span>
                  <div className="risk-track">
                    <i style={{ width: v + "%" }} />
                  </div>
                  <strong>{Number(v) < 30 ? "Low" : "Moderate"}</strong>
                </div>
              ))}
            </section>
            <button
              className="button secondary full"
              onClick={() =>
                onContext({
                  ...context,
                  period: context.period === "baseline" ? "2050s" : "baseline",
                })
              }
            >
              View{" "}
              {context.period === "baseline" ? "2050s scenario" : "baseline"}
              <ArrowRight size={15} />
            </button>
          </>
        )}
        {tab === "Soil" && (
          <>
            <div className="section-heading">
              <h3>
                {cell ? "This cell’s soil" : "A view beneath the surface"}
              </h3>
              <span className="pill neutral">Synthetic</span>
            </div>
            <TabInsight>{insight["Soil"]}</TabInsight>
            <p className="body-muted">
              {cell
                ? "Cell-specific mock values."
                : "Mean values across the 36 sampled 1 km cells."}{" "}
              Soil tests are needed to establish actual field conditions.
            </p>
            <div className="metric-pair">
              <div>
                <span>Soil pH</span>
                <strong>{soil.ph}</strong>
                <small>Crop screening range {crop.ph.join("–")}</small>
              </div>
              <div>
                <span>Organic carbon</span>
                <strong>
                  {soil.organicCarbon.toFixed(2)}
                  <small>%</small>
                </strong>
                <small>Illustrative topsoil value</small>
              </div>
            </div>
            <section className="detail-section">
              <h3>Soil texture</h3>
              <div className="soil-texture">
                {[
                  { n: "Sand", v: soil.sand, c: "#d4b57b" },
                  { n: "Silt", v: 100 - soil.sand - soil.clay, c: "#a4b89a" },
                  { n: "Clay", v: soil.clay, c: "#8b6d57" },
                ].map((x) => (
                  <div key={x.n}>
                    <div style={{ height: x.v * 2, background: x.c }} />
                    <strong>{x.v.toFixed(1)}%</strong>
                    <span>{x.n}</span>
                  </div>
                ))}
              </div>
            </section>
            <dl className="data-list">
              <div>
                <dt>Dominant soil</dt>
                <dd>{site.soilType}</dd>
              </div>
              <div>
                <dt>Bulk density</dt>
                <dd>{soil.bulkDensity.toFixed(2)} g/cm³</dd>
              </div>
              <div>
                <dt>Resolution</dt>
                <dd>1 × 1 km mock cells</dd>
              </div>
              <div>
                <dt>Depth represented</dt>
                <dd>0–30 cm · illustrative</dd>
              </div>
            </dl>
            <div className="inline-note">
              <FlaskConical size={18} />
              <span>Regional screening cannot replace a field soil test.</span>
            </div>
            <SoilDistributions site={site} />
            <button className="button secondary full" onClick={onEvidence}>
              <Plus size={15} />
              Attach soil test evidence
            </button>
          </>
        )}
        {tab === "Economics" && (
          <>
            <div className="section-heading">
              <h3>Economic assumptions</h3>
              <span className="pill neutral">Scenario</span>
            </div>
            <TabInsight>{insight["Economics"]}</TabInsight>
            <p className="body-muted">
              Test assumptions for one hectare. Demo amounts are normalised to
              INR for cross-country comparison. Costs and prices are
              illustrative; gross margin excludes rent, finance, taxes and
              transition costs.
            </p>
            <div className="economic-result">
              <span>Illustrative gross margin / ha</span>
              <strong className={margin < 0 ? "negative" : ""}>
                {money(margin)}
              </strong>
              <small>
                {money(o.yieldRange[0] * price - cost - logistics)} –{" "}
                {money(o.yieldRange[1] * price - cost - logistics)} yield range
              </small>
            </div>
            <button className="text-button economics-reset" onClick={() => { setPriceDelta(0); setCostDelta(0); setLogistics(6500); }} disabled={!priceDelta && !costDelta && logistics === 6500}><RotateCcw size={14} />Reset to demo baseline</button>
            <label className="slider-field">
              <span>
                Farmgate price <strong>{money(price)}/t</strong>
              </span>
              <input
                aria-label="Price adjustment"
                type="range"
                min="-30"
                max="30"
                value={priceDelta}
                onChange={(e) => setPriceDelta(+e.target.value)}
              />
              <small>
                {priceDelta > 0 ? "+" : ""}
                {priceDelta}% from demo baseline
              </small>
            </label>
            <label className="slider-field">
              <span>
                Production cost <strong>{money(cost)}/ha</strong>
              </span>
              <input
                aria-label="Cost adjustment"
                type="range"
                min="-20"
                max="30"
                value={costDelta}
                onChange={(e) => setCostDelta(+e.target.value)}
              />
            </label>
            <label>
              Delivered logistics cost / ha
              <input aria-label="Delivered logistics cost per hectare"
                type="number"
                min="0"
                max="100000"
                value={logistics}
                onChange={(e) => setLogistics(Math.min(100000, Math.max(0, Number(e.target.value) || 0)))}
              />
            </label>
            <dl className="data-list">
              <div>
                <dt>Estimated yield</dt>
                <dd>{o.yieldTHa.toFixed(2)} t/ha</dd>
              </div>
              <div>
                <dt>Gross revenue / ha</dt>
                <dd>{money(o.yieldTHa * price)}</dd>
              </div>
              <div>
                <dt>Break-even yield</dt>
                <dd>{((cost + logistics) / price).toFixed(2)} t/ha</dd>
              </div>
              <div>
                <dt>Water regime</dt>
                <dd>{context.water === "rainfed" ? "Rainfed" : "Irrigated"}</dd>
              </div>
            </dl>
            <button
              className="button primary full"
              onClick={() => onScenario({ price, cost, logistics })}
            >
              Save these assumptions
              <ArrowRight size={15} />
            </button>
          </>
        )}
        {tab === "Evidence" && (
          <>
            <div className="section-heading">
              <h3>What this is built on</h3>
              <span className="pill neutral">Demo model 1.0</span>
            </div>
            <div className="evidence-source">
              <span className="source-icon">
                <LeafIcon />
              </span>
              <div>
                <strong>Environmental screening</strong>
                <p>Synthetic soil, climate and terrain</p>
                <small>1 km mock grid · 2021–2025 baseline</small>
              </div>
              <span className="pill neutral">Modelled</span>
            </div>
            <div className="evidence-source">
              <span className="source-icon">
                <FlaskConical size={17} />
              </span>
              <div>
                <strong>Crop requirements</strong>
                <p>Species-level screening ranges</p>
                <small>Illustrative · not connected to FloraKB</small>
              </div>
            </div>
            <div className="inline-note">
              <Info size={17} />
              <span>
                AEZ classes group similar environments. They do not establish
                suitability. SBSF’s production 1 km grid is under development.
              </span>
            </div>
            <section className="detail-section">
              <div className="section-heading">
                <h3>Team evidence</h3>
                <button className="text-button" onClick={onEvidence}>
                  <Plus size={14} />
                  Add
                </button>
              </div>
              <TabInsight>{insight.Evidence}</TabInsight>
              {relevant.length ? (
                relevant.map((e) => (
                  <div className="evidence-entry" key={e.id}>
                    <FileCheck2 size={17} />
                    <div>
                      <strong>{e.name}</strong>
                      <small>
                        {e.type} · {e.date} · Demo evidence
                      </small>
                      <p>{e.note}</p>
                      {e.yield && (
                        <span className="pill green">
                          Observed demo yield: {e.yield} t/ha
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="body-muted">
                  No local evidence attached for {crop.name.toLowerCase()} here.
                  Add a trial, soil test or field note.
                </p>
              )}
            </section>
            <button
              className="text-button"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Hide" : "Show"} method & limitations{" "}
              {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showAll && (
              <div className="method-copy">
                <p>
                  All values and AEZ assignments are seeded synthetic examples.
                  Confidence indicates a demo model score, not a statistical
                  probability. No suitability result is certified or
                  field-validated.
                </p>
                <p>
                  Suitability summarises crop/environment fit; yield, prices,
                  risk and financial outputs are illustrative. Varieties and
                  hybrids need their own local trial evidence.
                </p>
                <p>
                  Climate periods average multiple years. A selected growing
                  season changes crop fit, not the annual climate period. No
                  current weather or market feed is connected.
                </p>
              </div>
            )}
          </>
        )}
      </div>
      </div>
      <div className="detail-footer">
        <button
          className={"button " + (saved ? "secondary" : "primary")}
          onClick={onSave}
        >
          {saved ? <Check size={15} /> : <Bookmark size={15} />}{" "}
          {saved ? "Saved to project" : "Save to project"}
        </button>
        <button
          className={"button secondary " + (compared ? "selected" : "")}
          onClick={onCompare}
        >
          <GitCompareArrows size={16} />
          {compared ? "In comparison" : "Compare"}
        </button>
      </div>
    </aside>
  );
}
function LeafIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M16 3C3 2 2 12 8 15C13 18 17 11 16 3ZM4 17L12 8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function GlobeOrigin() {
  return (
    <span className="source-icon">
      <MapPin size={20} />
    </span>
  );
}
function LayersOrigin() {
  return <FlaskConical size={15} />;
}
