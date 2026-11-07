"use client";
import TabInsight from "./tab-insight";
import { useId, useState } from "react";
import { X, Plus, Check, ArrowUpRight, Download, Bookmark, SlidersHorizontal, GitCompareArrows } from "lucide-react";
import { CompactComparisonMap, ClimateTimeline } from "./comparison-insights";
import DecisionLab from "./decision-lab";
import { candidateKey, candidateColors } from "../lib/decision-analysis";
import CandidatePicker from "./candidate-picker";
import SearchSelect from "./search-select";
import { db, getRecord, getSite, getCrop, money, csv, download, type Context, type Candidate, type Evidence } from "../lib/model";

type Metric = {label:string; unit?:string; hint?:string; direction?:"higher"|"lower"; values:(number|string)[]; format?:(n:number)=>string; comparable?:boolean};
const keyOf=(c:Candidate)=>c.siteId+":"+c.cropId;
export default function ComparisonWorkspace({candidates,context,initialSite,evidence,onAdd,onRemove,onInspect,onSave}:{candidates:Candidate[];context:Context;initialSite:string;evidence:Evidence[];onAdd:(site:string,crop:string)=>void;onRemove:(candidate:Candidate)=>void;onInspect:(candidate:Candidate)=>void;onSave:(candidates:Candidate[])=>void;projectName?:string}) {
  const [settings,setSettings]=useState({...context}), [tab,setTab]=useState("Fit & climate"), [differences,setDifferences]=useState(false), [reference,setReference]=useState(candidates[0]?keyOf(candidates[0]):""), [adding,setAdding]=useState(candidates.length<2), [showSettings,setShowSettings]=useState(false);
  const uid=useId();
  const [view,setView]=useState("overview");
  const tabs=["Fit & climate","Soil & terrain","Commercial outlook","Evidence"];
  const soilMean=(candidate:Candidate,key:"ph"|"clay"|"organicCarbon"|"bulkDensity")=>{const cells=db.cells.filter(c=>c.locationId===candidate.siteId);return cells.reduce((sum,cell)=>sum+cell.soil[key],0)/cells.length;};
  const refs=candidates.findIndex(c=>keyOf(c)===reference), refIndex=refs<0?0:refs;
  const records=candidates.map(c=>getRecord(c.siteId,settings,c.cropId));
  const sameCrop=new Set(candidates.map(c=>c.cropId)).size<=1;
  const applied=candidates.map(c=>({...c,context:{...settings,crop:c.cropId}}));
  const metrics:Metric[]=tab==="Fit & climate"?[
    {label:"Environmental fit",unit:"/100",direction:"higher",values:records.map(o=>o.suitability),format:n=>n.toFixed(1)},
    {label:"Model confidence index",unit:"/100",hint:"Synthetic index, not probability",values:records.map(o=>o.confidence),format:n=>n.toFixed(0)},
    {label:"Potential yield",unit:"t/ha",hint:"Different crops have different products and yield scales",values:records.map(o=>o.yieldRange.join("–"))},
    {label:"Mean yield estimate",unit:"t/ha",values:records.map(o=>o.yieldTHa),format:n=>n.toFixed(2),comparable:sameCrop},
    {label:"Annual rainfall",unit:"mm",values:records.map(o=>Math.round(o.annualRainfallMm))},
    {label:"Mean temperature",unit:"°C",values:records.map(o=>o.meanTemperatureC),format:n=>n.toFixed(1)},
    {label:"Drought exposure",unit:"/100",direction:"lower",values:records.map(o=>o.droughtRisk)},
    {label:"Heat exposure",unit:"/100",direction:"lower",values:records.map(o=>o.heatRisk)},
    {label:"Supplemental water",unit:"mm",direction:"lower",values:records.map(o=>o.supplementalWaterMm)},
  ]:tab==="Soil & terrain"?[
    {label:"Mean soil pH",hint:"Synthetic 0–30 cm sample",values:candidates.map(c=>soilMean(c,"ph")),format:n=>n.toFixed(1)},
    {label:"Clay content",unit:"%",values:candidates.map(c=>soilMean(c,"clay")),format:n=>n.toFixed(1)},
    {label:"Organic carbon",unit:"%",values:candidates.map(c=>soilMean(c,"organicCarbon")),format:n=>n.toFixed(2)},
    {label:"Bulk density",unit:"g/cm³",values:candidates.map(c=>soilMean(c,"bulkDensity")),format:n=>n.toFixed(2)},
    {label:"Soil type",values:candidates.map(c=>getSite(c.siteId).soilType)},
    {label:"Growing window",values:candidates.map(c=>getSite(c.siteId).growingWindow)},
    {label:"Climate zone",values:candidates.map(c=>getSite(c.siteId).aezId)},
  ]:tab==="Commercial outlook"?[
    {label:"Gross margin / ha",unit:"INR",direction:"higher",values:records.map(o=>o.yieldTHa*o.priceINRTonne-o.inputCostINRHa-6500),format:money},
    {label:"Farmgate price / tonne",unit:"INR",values:records.map(o=>o.priceINRTonne),format:money,comparable:sameCrop},
    {label:"Input cost / ha",unit:"INR",direction:"lower",values:records.map(o=>o.inputCostINRHa),format:money},
    {label:"Logistics / ha",unit:"INR",hint:"Fixed assumption for every candidate",values:records.map(()=>6500),format:money},
    {label:"Break-even yield",unit:"t/ha",values:records.map(o=>(o.inputCostINRHa+6500)/o.priceINRTonne),format:n=>n.toFixed(2),comparable:sameCrop},
    {label:"Nearby processors",hint:"Verify availability and capacity",values:candidates.map(c=>getSite(c.siteId).processorCount)},
    {label:"Road connection",unit:"km",direction:"lower",values:candidates.map(c=>getSite(c.siteId).roadKm)},
    {label:"Port distance",unit:"km",direction:"lower",values:candidates.map(c=>getSite(c.siteId).portKm)},
  ]:[
    {label:"Team records",values:candidates.map(c=>evidence.filter(e=>e.locationId===c.siteId&&e.cropId===c.cropId).length)},
    {label:"Sample area",unit:"ha",values:candidates.map(c=>getSite(c.siteId).sampledAreaHa)},
    {label:"Sample cells",values:candidates.map(c=>getSite(c.siteId).cellCount)},
    {label:"Soil test attached",values:candidates.map(c=>evidence.some(e=>e.locationId===c.siteId&&e.cropId===c.cropId&&/soil/i.test(e.type))?"Yes":"No")},
    {label:"Field trial attached",values:candidates.map(c=>evidence.some(e=>e.locationId===c.siteId&&e.cropId===c.cropId&&/trial/i.test(e.type))?"Yes":"No")},
    {label:"Model version",values:candidates.map(()=>"demo-1.0")},
  ];
  const range=(values:number[],digits=0)=>`${Math.min(...values).toFixed(digits)}–${Math.max(...values).toFixed(digits)}`;
  const insight:Record<string,string>={
    'Fit & climate':`Environmental fit spans ${range(records.map(o=>o.suitability),1)}/100, while drought exposure spans ${range(records.map(o=>o.droughtRisk))}/100. Read both together when assessing growing conditions.`,
    'Soil & terrain':`Mean soil pH spans ${range(candidates.map(c=>soilMean(c,'ph')),1)} across these samples. Averages can hide field variation; check soil-test evidence before planning amendments.`,
    'Commercial outlook':`Illustrative margins span ${money(Math.min(...records.map(o=>o.yieldTHa*o.priceINRTonne-o.inputCostINRHa-6500)))}–${money(Math.max(...records.map(o=>o.yieldTHa*o.priceINRTonne-o.inputCostINRHa-6500)))}/ha. Local quotes, quality requirements and logistics can change this range.`,
    Evidence:`${candidates.filter(c=>evidence.some(e=>e.locationId===c.siteId&&e.cropId===c.cropId)).length} of ${candidates.length} candidates have attached team records. Evidence coverage is not a measure of field performance.`,
  };
  const shown=metrics.filter(m=>!differences||candidates.length<2||new Set(m.values.map(String)).size>1);
  function exportComparison(){download("croplocator-comparison.csv",csv(candidates.map((c,i)=>({location:getSite(c.siteId).name,country:getSite(c.siteId).country,crop:getCrop(c.cropId).name,period:settings.period,scenario:settings.period==="baseline"?"historical":settings.scenario,season:settings.season,water:settings.water,...Object.fromEntries(metrics.map(m=>[m.label+(m.unit?` (${m.unit})`:""),m.values[i]]))}))),"text/csv");}
  return <div className="comparison-workspace">
    <div className="comparison-primary-toolbar"><nav className="comparison-primary-views" aria-label="Comparison views">{[["overview","Comparison overview"],["lab","Decision lab"]].map(([id,label])=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</nav><div className="compare-utility-actions"><button className="button secondary" disabled={!candidates.length} onClick={exportComparison}><Download size={14}/>Export comparison</button><button className="button primary" disabled={!candidates.length} onClick={()=>onSave(applied)}><Bookmark size={14}/>Save shortlist</button></div></div>
    <div className="compare-context-bar"><div><span className="context-kicker">SHARED ASSUMPTIONS</span><strong>{db.periods.find(p=>p.id===settings.period)?.range}<span>·</span>{settings.season}<span>·</span>{settings.water === "rainfed"?"Rainfed":"Irrigated"}</strong><small>{settings.period==='baseline'?'Historical baseline':settings.scenario==='ssp245'?'SSP2-4.5':'SSP5-8.5'}</small></div><button className="button secondary" aria-expanded={showSettings} onClick={()=>setShowSettings(!showSettings)}><SlidersHorizontal size={15}/>Adjust context</button></div>
    {showSettings&&<div className="compare-settings"><label>Climate period<SearchSelect aria-label="Compare climate period" value={settings.period} onChange={e=>setSettings({...settings,period:e.target.value})}>{db.periods.map(p=><option key={p.id} value={p.id}>{p.label} · {p.range}</option>)}</SearchSelect></label><label>Growing season<SearchSelect aria-label="Compare growing season" value={settings.season} onChange={e=>setSettings({...settings,season:e.target.value})}>{['Main season','Kharif','Rabi'].map(s=><option key={s}>{s}</option>)}</SearchSelect></label><label>Water regime<SearchSelect aria-label="Compare water regime" value={settings.water} onChange={e=>setSettings({...settings,water:e.target.value})}><option value="rainfed">Rainfed</option><option value="irrigated">Irrigated</option></SearchSelect></label><label>Emissions pathway<SearchSelect aria-label="Compare emissions pathway" disabled={settings.period==='baseline'} value={settings.scenario} onChange={e=>setSettings({...settings,scenario:e.target.value})}><option value="ssp245">SSP2-4.5 · intermediate</option><option value="ssp585">SSP5-8.5 · high emissions</option></SearchSelect></label><p>These controls affect this comparison only. Saving and exports use these assumptions.</p></div>}
    <div className="compare-candidate-toolbar"><div><strong>{candidates.length} of 3 candidates</strong></div><button className="text-button" aria-expanded={adding} onClick={()=>setAdding(!adding)}><Plus size={15}/>{adding?'Hide candidate picker':'Add candidate'}</button></div>
    <div hidden={!adding}><CandidatePicker initialSite={initialSite} initialCrop={context.crop} candidates={candidates} onAdd={(site,crop)=>{onAdd(site,crop);if(candidates.length>=1)setAdding(false);}}/></div>
    {!candidates.length?<div className="compare-empty"><GitCompareArrows size={30}/><h3>Start with two possibilities</h3><p>Add crops for one location, or compare the same crop across growing regions.</p></div>:<>
      <div hidden={view!=="lab"}><DecisionLab candidates={candidates} context={settings} evidence={evidence} onContextChange={setSettings}/></div>
      {view==="overview"&&<>
      <div id={`${uid}-metrics`} className="compare-view-toolbar"><div className="compare-view-tabs" role="tablist" aria-label="Comparison sections">{tabs.map((t,i)=><button role="tab" id={`${uid}-${i}`} aria-selected={tab===t} aria-controls={`${uid}-panel`} tabIndex={tab===t?0:-1} key={t} onClick={()=>setTab(t)} onKeyDown={e=>{const list=Array.from(e.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]'));let next=i;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();list[next].click();list[next].focus();}}>{t}</button>)}</div><div className="compare-section-actions"><label className="compare-difference-toggle"><input type="checkbox" checked={differences} disabled={candidates.length<2} onChange={e=>setDifferences(e.target.checked)}/>Differences only</label><a className="compare-timeline-jump" href={`#${uid}-timeline`}>Climate over time ↓</a></div></div>
      <header className="compare-tab-insight section-context-heading"><h3>{tab}</h3><TabInsight>{insight[tab]}</TabInsight></header>
      <div className="compare-metric-map-layout"><CompactComparisonMap context={settings} candidates={candidates} selected={reference} onSelect={setReference}/>
      <div className="compare-analysis-column">
      <div className="compare-matrix-scroll" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-${tabs.indexOf(tab)}`} tabIndex={0}><table className="compare-matrix" style={{minWidth:(candidates.length+1)*195}}><caption className="sr-only">{tab}: candidates evaluated with shared assumptions. Highlighted cells indicate the strongest value for the labeled metric only.</caption><thead><tr><th scope="col" className="compare-metric-heading"><span>{tab}</span><small>{shown.length} metrics{differences?` · ${metrics.length-shown.length} identical hidden`:''}</small></th>{candidates.map((c,i)=>{const site=getSite(c.siteId);return <th scope="col" className="comparison-column" key={keyOf(c)}><div className="compare-candidate-heading"><span className="candidate-index" style={{color:candidateColors[i]}}>0{i+1}</span><button className="icon-button" aria-label={`Remove ${site.name} ${getCrop(c.cropId).name}`} title="Remove candidate" onClick={()=>onRemove(c)}><X size={15}/></button><h3>{site.name}</h3><p>{getCrop(c.cropId).name} · {site.country}</p><button className={"reference-button "+(i===refIndex?'active':'')} aria-pressed={i===refIndex} onClick={()=>setReference(keyOf(c))}>{i===refIndex?<Check size={12}/>:null}{i===refIndex?'Reference':'Use as reference'}</button><button className="compare-inspect" onClick={()=>onInspect(applied[i])}>Inspect location<ArrowUpRight size={13}/></button></div></th>})}</tr></thead><tbody>{shown.map(m=>{const nums=m.values.filter(v=>typeof v==='number') as number[];const best=m.direction==='higher'?Math.max(...nums):Math.min(...nums);const spread=new Set(m.values.map(String)).size>1;return <tr key={m.label}><th scope="row">{m.label}{m.unit&&<span>{m.unit}</span>}{m.hint&&<small>{m.hint}</small>}{m.direction&&<small className="metric-direction">{m.direction==='higher'?'Higher':'Lower'} is preferable</small>}</th>{m.values.map((v,i)=>{const reference=m.values[refIndex];const delta=typeof v==='number'&&typeof reference==='number'?v-reference:0;const format=m.format||((n:number)=>Number.isInteger(n)?n.toLocaleString():n.toFixed(1));return <td key={i} className={m.direction&&spread&&v===best?'metric-strongest':''}><strong>{typeof v==='number'?format(v):v}</strong>{i!==refIndex&&typeof v==='number'&&m.comparable!==false&&<small className="metric-delta">{Math.abs(delta)<.005?'Same as reference':`${delta>0?'+':'−'}${format(Math.abs(delta))} vs reference`}</small>}{m.direction&&spread&&v===best&&<span className="metric-best">Best in this row</span>}</td>})}</tr>})}{!shown.length&&<tr><td colSpan={candidates.length+1} className="compare-identical">All metrics in this section are identical. Turn off “Differences only” to see them.</td></tr>}</tbody></table></div>
      <section id={`${uid}-timeline`} className="compare-integrated-timeline" aria-label="Climate over time"><div className="compare-timeline-return"><a href={`#${uid}-metrics`}>Back to map & metrics ↑</a></div><ClimateTimeline candidates={candidates} context={settings} onScenarioChange={scenario=>setSettings(current=>({...current,scenario}))}/></section>
      </div></div>
      </>}
    </>}
  </div>;
}
