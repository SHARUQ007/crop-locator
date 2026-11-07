"use client";
import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import { LocateFixed, Minus, Plus, MapPin } from 'lucide-react';
import { getCrop, getSite, type Candidate } from '../lib/model';
import { candidateKey, candidateColors } from '../lib/decision-analysis';

export default function ComparisonMap({ candidates, selected, onSelect }: { candidates:Candidate[];selected:string;onSelect:(key:string)=>void }) {
  const root = useRef<HTMLDivElement>(null), map = useRef<LeafletMap|null>(null), group=useRef<LayerGroup|null>(null), callback=useRef(onSelect);
  callback.current=onSelect;
  const [ready,setReady]=useState(false),[error,setError]=useState(false),[unavailable,setUnavailable]=useState(false);
  const locations = [...new Set(candidates.map(c=>c.siteId))].sort().join('|');
  useEffect(()=>{
    let disposed=false;
    import('leaflet').then(L=>{
      if(disposed||!root.current)return;
      const instance=L.map(root.current,{zoomControl:false,scrollWheelZoom:false,minZoom:2,maxZoom:12,attributionControl:true}).setView([20,12],2);
      map.current=instance;
      let tileErrors=0;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).on('tileerror',()=>{if(++tileErrors>3&&!disposed)setError(true);}).addTo(instance);
      group.current=L.layerGroup().addTo(instance);
      L.control.scale({imperial:false}).addTo(instance);
      const observer=new ResizeObserver(()=>instance.invalidateSize({pan:false}));observer.observe(root.current);
      (instance as LeafletMap & {disconnectObserver?:()=>void}).disconnectObserver=()=>observer.disconnect();
      setReady(true);
    }).catch(()=>{if(!disposed)setUnavailable(true);});
    return()=>{disposed=true;const instance=map.current as (LeafletMap & {disconnectObserver?:()=>void})|null;instance?.disconnectObserver?.();instance?.remove();map.current=null;group.current=null;};
  },[]);
  useEffect(()=>{
    if(!ready||!map.current||!candidates.length)return;
    import('leaflet').then(L=>{
      if(!map.current)return;
      const points=[...new Set(candidates.map(c=>c.siteId))].map(id=>getSite(id).center as [number,number]);
      map.current.fitBounds(L.latLngBounds(points),{padding:[65,65],maxZoom:7,animate:false});
    });
  },[ready,locations]);
  useEffect(()=>{
    if(!ready||!group.current)return;
    import('leaflet').then(L=>{
      if(!group.current)return;
      group.current.clearLayers();
      const siteIds=[...new Set(candidates.map(c=>c.siteId))];
      siteIds.forEach(siteId=>{
        const site=getSite(siteId), indexes=candidates.map((c,i)=>c.siteId===siteId?i:-1).filter(i=>i>=0);
        const element=document.createElement('div');element.className='compare-map-marker';
        indexes.forEach(i=>{
          const button=document.createElement('button');button.type='button';button.textContent=String(i+1);button.style.background=candidateColors[i];button.className=selected===candidateKey(candidates[i])?'active':'';button.setAttribute('aria-label',`Select ${site.name}, ${getCrop(candidates[i].cropId).name}`);button.setAttribute('aria-pressed',String(selected===candidateKey(candidates[i])));button.addEventListener('click',event=>{event.stopPropagation();callback.current(candidateKey(candidates[i]));});element.appendChild(button);
        });
        const label=document.createElement('span');label.textContent=site.name;element.appendChild(label);
        const icon=L.divIcon({className:'compare-map-marker-host',html:element,iconSize:[Math.max(40,indexes.length*34),45],iconAnchor:[Math.max(20,indexes.length*17),20]});
        L.marker(site.center as [number,number],{icon,keyboard:false}).addTo(group.current!);
      });
    });
  },[ready,candidates,selected]);
  function fit(){if(!map.current)return;import('leaflet').then(L=>{if(map.current&&candidates.length)map.current.fitBounds(L.latLngBounds(candidates.map(c=>getSite(c.siteId).center as [number,number])),{padding:[65,65],maxZoom:7,animate:false});});}
  return <div className="compare-geographic-map"><div ref={root} className="compare-map-canvas" role="region" aria-label="Candidate comparison map"/>{!ready&&!unavailable&&<div className="compare-map-loading" role="status"><MapPin size={20}/>Loading candidate map…</div>}{(error||unavailable)&&<div className="compare-map-message" role="status">{unavailable?'Map unavailable.':'Base map tiles are unavailable.'} Candidate details and distances are available beside the map.</div>}<div className="compare-map-controls"><button title="Zoom in" aria-label="Zoom comparison map in" onClick={()=>map.current?.zoomIn()}><Plus size={16}/></button><button title="Zoom out" aria-label="Zoom comparison map out" onClick={()=>map.current?.zoomOut()}><Minus size={16}/></button><button title="Fit all candidates" aria-label="Fit all comparison candidates" onClick={fit}><LocateFixed size={16}/></button></div><span className="compare-map-scale-note">Regional context · sample centres</span></div>;
}
