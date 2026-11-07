"use client";
import TabInsight from "./tab-insight";
import {useState} from 'react';
import {Bug,ArrowUpRight,Download,Plus} from 'lucide-react';
import {healthReferences} from '../lib/crop-health';
import {getCrop,csv,download,type Context,type Site,type Evidence} from '../lib/model';
import SearchSelect from './search-select';
import {SearchField} from './workspace-ui';
import {matchesSearch} from '../lib/search';
export default function CropHealth({site,context,evidence,onEvidence,summary}:{summary?:string;site:Site;context:Context;evidence:Evidence[];onEvidence:()=>void}){
 const [kind,setKind]=useState('All'),[stage,setStage]=useState('All'),[query,setQuery]=useState('');
 const crop=getCrop(context.crop),references=healthReferences[crop.id]||[];
 const filtered=references.filter(item=>(kind==='All'||item.kind===kind)&&(stage==='All'||item.stage===stage)&&matchesSearch(item.name+' '+item.check,query));
 const records=evidence.filter(item=>item.locationId===site.id&&item.cropId===crop.id&&/pest|disease|scout|pathogen|insect|blight|aphid|wilt|bollworm|rot|rust/i.test(item.name+' '+item.type+' '+item.note));
 function exportPlan(){download(`${site.id}-${crop.id}-scouting-plan.csv`,csv(filtered.map(item=>({location:site.name,crop:crop.name,...item,source_checked:'2026-11-07',status:'Reference only; local presence unverified'}))),'text/csv');}
 return <div className="crop-health"><div className="feature-section-heading"><div><span className="eyebrow">CROP HEALTH</span><h3>Pests & diseases</h3><TabInsight>{summary||`Use this ${crop.name.toLowerCase()} watchlist to plan scouting at ${site.name}. Local occurrence has not been assessed.`}</TabInsight></div><button className="button secondary" onClick={exportPlan}><Download size={14}/>Export watchlist</button></div>
 <div className="health-context"><Bug size={19}/><div><strong>Local occurrence has not been assessed</strong><p>Reference entries guide scouting. No live surveillance or validated pest forecast is connected for this location.</p></div></div>
 <div className="health-toolbar"><SearchField label="Search pests and diseases" value={query} onChange={setQuery} placeholder="Search the watchlist…"/><label>Type<SearchSelect aria-label="Health reference type" value={kind} onChange={e=>setKind(e.target.value)}>{['All','Pest','Disease'].map(v=><option key={v}>{v}</option>)}</SearchSelect></label><label>Scouting focus<SearchSelect aria-label="Scouting stage" value={stage} onChange={e=>setStage(e.target.value)}>{['All','Establishment','Vegetative','Reproductive'].map(v=><option key={v}>{v}</option>)}</SearchSelect></label></div>
 <div className="health-reference-grid">{filtered.map(item=><article key={item.name} className="health-reference-card"><div><span className={'health-kind '+item.kind.toLowerCase()}>{item.kind}</span><span>{item.stage}</span></div><h4>{item.name}</h4><p>{item.check}</p><details><summary>Reference & local checks</summary><p>{item.geography} reference. Confirm local relevance, seasonal timing and cultivar susceptibility with an agronomist.</p><a href={item.url} target="_blank" rel="noreferrer">{item.source}<ArrowUpRight size={13}/></a></details></article>)}</div>
 {!filtered.length&&<div className="search-empty"><h4>No matching references</h4><button className="text-button" onClick={()=>{setKind('All');setStage('All');setQuery('')}}>Clear filters</button></div>}
 <section className="health-evidence"><div className="feature-section-heading"><div><h4>Field observations</h4><p>{records.length?`${records.length} matching team records`:'Build a local record of symptoms, scouting and diagnosis.'}</p></div><button className="button secondary" onClick={onEvidence}><Plus size={14}/>Add field evidence</button></div>{records.length>0&&<ul>{records.map(item=><li key={item.id}><strong>{item.name}</strong><span>{item.date} · {item.type}</span><p>{item.note}</p></li>)}</ul>}<details><summary>What to capture during scouting</summary><ol><li>Field, date, crop stage and variety.</li><li>Sample method, plants inspected and affected plants; include healthy areas.</li><li>Symptoms, photographs and observations of beneficial insects.</li><li>Diagnostic confirmation, local threshold and follow-up date.</li></ol></details></section>
 <p className="advanced-note">Planning stages are editorial scouting prompts, not pest calendars. Sources checked 7 Nov 2026; regional references do not establish local presence. Treatment decisions require local diagnosis and current guidance.</p></div>;
}
