"use client";
import { useState } from "react";
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
} from "lucide-react";
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
    [showAll, setShowAll] = useState(false);
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
  return (
    <aside className="detail-panel">
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
          title="Inspect 1 km cells"
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
        {crop.name}
        <span>·</span>
        {context.season}
        <span>·</span>
        {db.periods.find((p) => p.id === context.period)?.range}
      </div>
      {cropOpportunities && (
        <section className="crop-opportunities" aria-label="Crop opportunities">
          <div className="opportunity-heading"><div><h3>Crop opportunities</h3><p>All {db.crops.length} screened crops for {site.name}. Select a crop to inspect its details.</p></div><span>Synthetic screening</span></div>
          <div className="opportunity-grid">
            {db.crops.map((candidate) => ({ crop: candidate, record: getRecord(site.id, context, candidate.id) }))
              .sort((a, b) => b.record.suitability - a.record.suitability)
              .map(({ crop: candidate, record }) => (
                <article key={candidate.id} className={"opportunity-card " + (context.crop === candidate.id ? "active" : "")}>
                  <button className="opportunity-select" onClick={() => onContext({ ...context, crop: candidate.id })} aria-pressed={context.crop === candidate.id}>
                    <strong>{candidate.name}<span>{Math.round(record.suitability)}<small>/100</small></span></strong>
                    <span>{fitLabel(record.suitability)} fit</span>
                    <small>Yield range {record.yieldRange.join("–")} t/ha</small>
                  </button>
                  <button className="text-button" onClick={() => onCompareCrop?.(candidate.id)} aria-pressed={comparedCrops.includes(candidate.id)}>
                    {comparedCrops.includes(candidate.id) ? <Check size={14} /> : <Plus size={14} />} {comparedCrops.includes(candidate.id) ? "Added to comparison" : "Compare crop"}
                  </button>
                </article>
              ))}
          </div>
        </section>
      )}
      <div className="detail-tabs">
        {[
          "Overview",
          "Growing context",
          "Climate",
          "Soil",
          "Economics",
          "Evidence",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Evidence" && relevant.length > 0 && (
              <i>{relevant.length}</i>
            )}
          </button>
        ))}
      </div>
      <div className="detail-body" data-tab={tab} key={site.id + tab}>
        {tab === "Overview" && (
          <>
            <div className="fit-summary">
              <div
                className="fit-ring"
                style={{ "--fit": o.suitability + "%" } as React.CSSProperties}
              >
                <strong>
                  {Math.round(o.suitability)}
                  <small>/100</small>
                </strong>
              </div>
              <div>
                <span className="pill green">{fitLabel(o.suitability)}</span>
                <h3>
                  {o.suitability >= 85
                    ? "A strong environmental match."
                    : o.suitability >= 70
                      ? "A promising growing environment."
                      : "Constraints need a closer look."}
                </h3>
                <p>
                  Species-level screening for {crop.name.toLowerCase()}. Confirm
                  locally before investing.
                </p>
              </div>
            </div>
            <div className="confidence-row">
              <span>
                <i className="live-dot" />
                Model confidence
              </span>
              <strong>
                {Math.round(o.confidence)}%{" "}
                <span>{o.confidence >= 85 ? "High" : "Moderate"}</span>
              </strong>
            </div>
            <section className="detail-section">
              <div className="section-heading">
                <h3>What’s driving the fit?</h3>
                <span className="muted">Illustrative factors</span>
              </div>
              {factors.map((f) => (
                <div className="factor" key={f.name}>
                  <div>
                    <span>{f.name}</span>
                    <strong>{f.score}</strong>
                  </div>
                  <div>
                    <i style={{ width: f.score + "%" }} />
                  </div>
                </div>
              ))}
            </section>
            <div className="insight-card">
              <Droplets size={18} />
              <div>
                <strong>
                  {o.droughtRisk > 40
                    ? "Water access needs a closer look"
                    : "Validate the match on the ground"}
                </strong>
                <p>
                  Check local water availability, drainage and soil conditions
                  before transferring a growing practice.
                </p>
              </div>
            </div>
            <section className="detail-section">
              <h3>A little more context</h3>
              <dl className="data-list">
                <div>
                  <dt>Screened sample</dt>
                  <dd>{cell ? "1 cell · 100 ha" : "36 cells · 3,600 ha"}</dd>
                </div>
                <div>
                  <dt>Environment</dt>
                  <dd>{aez.classification}</dd>
                </div>
                <div>
                  <dt>Potential yield</dt>
                  <dd>
                    {o.yieldRange[0]}–{o.yieldRange[1]} t/ha
                  </dd>
                </div>
                <div>
                  <dt>Nearby processors</dt>
                  <dd>
                    {site.processorCount}{" "}
                    <span className="muted">illustrative</span>
                  </dd>
                </div>
              </dl>
              <button
                className="text-button"
                onClick={() => setTab("Evidence")}
              >
                Understand the evidence <ArrowRight size={14} />
              </button>
            </section>
          </>
        )}
        {tab === "Growing context" && (
          <>
            <div className="section-heading">
              <h3>Learn from this growing origin</h3>
              <span className="pill neutral">Sourced context</span>
            </div>
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
            <button className="button secondary full" onClick={onEvidence}>
              <Plus size={15} />
              Attach soil test evidence
            </button>
          </>
        )}
        {tab === "Economics" && (
          <>
            <div className="section-heading">
              <h3>Does the decision add up?</h3>
              <span className="pill neutral">Scenario</span>
            </div>
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
              <input
                type="number"
                min="0"
                max="100000"
                value={logistics}
                onChange={(e) => setLogistics(Math.max(0, +e.target.value))}
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
