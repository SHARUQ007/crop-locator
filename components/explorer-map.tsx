"use client";
import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, LayerGroup, TileLayer, Rectangle, LatLng } from 'leaflet';
import { Plus, Minus, LocateFixed, Layers, Check, Maximize2, Minimize2, RotateCcw, Map as MapIcon, Search, X, ArrowUpRight, Info } from 'lucide-react';
import { db, getRecord, getSite, fitLabel, type Context, type Site } from '../lib/model';
import { geographyLabel } from '../lib/geography';
import { areaWeightedScore, type SearchBounds } from '../lib/map-search';
import { useDismiss } from '../hooks/use-dismiss';

type Props={context:Context;sites:Site[];coverageSites?:Site[];selected:string|null;onSelect:(id:string)=>void;onCell:(id:string)=>void;layer:string;onLayer:(value:string)=>void;zoomTo:number;draw:boolean;onDraw:(ids:string[])=>void;onCountry:(value:string)=>void;expanded?:boolean;onExpand?:()=>void;query?:string;areaActive?:boolean;onBoundsSearch?:(bounds:SearchBounds)=>void;onClearArea?:()=>void;onResetFilters?:()=>void;onClearSelection?:()=>void;onDrawCancel?:()=>void;hovered?:string|null;onHover?:(id:string|null)=>void};
export default function ExplorerMap({context,sites,coverageSites=sites,selected,onSelect,onCell,layer,onLayer,zoomTo,draw,onDraw,onCountry,expanded=false,onExpand,query='',areaActive=false,onBoundsSearch,onClearArea,onResetFilters,onClearSelection,onDrawCancel,hovered,onHover}:Props) {
 const leaflet=useRef<typeof import('leaflet')|null>(null);
 const root=useRef<HTMLDivElement>(null),map=useRef<LeafletMap|null>(null),overlays=useRef<LayerGroup|null>(null),base=useRef<TileLayer|null>(null);
 const callbacks=useRef({onSelect,onCell,onDraw,onCountry,onHover});callbacks.current={onSelect,onCell,onDraw,onCountry,onHover};
 const sitesRef=useRef(sites);sitesRef.current=sites;const coverageRef=useRef(coverageSites);coverageRef.current=coverageSites;
 const drawRef=useRef(draw);drawRef.current=draw;
 const programmatic=useRef(false),userMoved=useRef(false),dragStart=useRef<LatLng|null>(null),dragBox=useRef<Rectangle|null>(null),observer=useRef<ResizeObserver|null>(null);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[layers,setLayers]=useState(false),[satellite,setSatellite]=useState(false),[tileError,setTileError]=useState(false),[zoom,setZoom]=useState(2),[viewportTick,setViewportTick]=useState(0),[moved,setMoved]=useState(false),[visible,setVisible]=useState(0),[grid,setGrid]=useState(false),[legend,setLegend]=useState(false),[cluster,setCluster]=useState<string[]>([]);
 const layerRoot=useDismiss(layers,()=>setLayers(false));
 function cancelDrawing(){if(map.current&&dragBox.current)map.current.removeLayer(dragBox.current);dragBox.current=null;dragStart.current=null;map.current?.dragging.enable();}
 useEffect(()=>{
  let disposed=false;
  import('leaflet').then(L=>{
   if(disposed||!root.current)return;leaflet.current=L;
   const instance=L.map(root.current,{zoomControl:false,scrollWheelZoom:false,minZoom:2,maxZoom:15,worldCopyJump:true}).setView([20,10],2);map.current=instance;
   let errors=0;
   base.current=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).on('tileerror',()=>{if(++errors>=4&&!disposed)setTileError(true);}).on('load',()=>{errors=0;}).addTo(instance);
   overlays.current=L.layerGroup().addTo(instance);L.control.scale({position:'bottomright',imperial:false}).addTo(instance);
   instance.on('dragstart zoomstart',()=>{if(!programmatic.current)userMoved.current=true;});
   instance.on('moveend',()=>{if(disposed)return;setViewportTick(value=>value+1);setZoom(instance.getZoom());setMoved(userMoved.current);programmatic.current=false;});
   instance.on('mousedown',(event)=>{if(!drawRef.current)return;cancelDrawing();dragStart.current=event.latlng;instance.dragging.disable();dragBox.current=L.rectangle(L.latLngBounds(event.latlng,event.latlng),{color:'#39795a',weight:2,fillOpacity:.12}).addTo(instance);});
   instance.on('mousemove',(event)=>{if(dragStart.current&&dragBox.current)dragBox.current.setBounds(L.latLngBounds(dragStart.current,event.latlng));});
   instance.on('mouseup',(event)=>{if(!dragStart.current)return;const bounds=L.latLngBounds(dragStart.current,event.latlng);const ids=sitesRef.current.filter(site=>bounds.contains(site.center as [number,number])).map(site=>site.id);cancelDrawing();callbacks.current.onDraw(ids);});
   observer.current=new ResizeObserver(()=>instance.invalidateSize({pan:false,debounceMoveend:true}));observer.current.observe(root.current);const initial=sitesRef.current.length?sitesRef.current:coverageRef.current;if(initial.length){programmatic.current=true;instance.fitBounds(L.latLngBounds(initial.map(site=>site.center as [number,number])),{paddingTopLeft:[55,80],paddingBottomRight:[65,90],maxZoom:context.region==='Worldwide'?3:initial.length===1?7:8,animate:false});}setZoom(instance.getZoom());setReady(true);
  }).catch(()=>{if(!disposed)setFailed(true);});
  const release=()=>cancelDrawing();window.addEventListener('mouseup',release);window.addEventListener('blur',release);
  return()=>{disposed=true;window.removeEventListener('mouseup',release);window.removeEventListener('blur',release);observer.current?.disconnect();map.current?.remove();map.current=null;overlays.current=null;};
 },[]);
 useEffect(()=>{if(!draw)cancelDrawing();},[draw]);
 function frame(items:Site[],maxZoom=8){const L=leaflet.current;if(!items.length||!map.current||!L)return;programmatic.current=true;userMoved.current=false;setMoved(false);map.current.fitBounds(L.latLngBounds(items.map(site=>site.center as [number,number])),{paddingTopLeft:[55,80],paddingBottomRight:[65,90],maxZoom:items.length===1?Math.min(maxZoom,7):maxZoom,animate:false});setCluster([]);}
 useEffect(()=>{
  if(!ready)return;
  const timer=setTimeout(()=>{if(areaActive)return;const items=sitesRef.current;if(items.length)frame(items,context.region==='Worldwide'&&items.length>5?3:8);else if(!query)frame(coverageRef.current,context.region==='Worldwide'?3:7);},query?450:0);
  return()=>clearTimeout(timer);
 },[ready,context.region,query,areaActive]);
 useEffect(()=>{if(!ready||!selected||!map.current)return;const site=getSite(selected);programmatic.current=true;map.current.panInside(site.center as [number,number],{paddingTopLeft:[map.current.getSize().x>600?290:65,map.current.getSize().x>600?110:210],paddingBottomRight:[70,90]});},[ready,selected]);
 useEffect(()=>{if(ready&&selected&&zoomTo)frame([getSite(selected)],7);},[ready,zoomTo]);
 useEffect(()=>{
  if(!ready||!map.current||!base.current)return;
  const old=base.current.options.attribution;if(old)map.current.attributionControl.removeAttribution(old);
  base.current.options.attribution=satellite?'Tiles &copy; Esri, Maxar, Earthstar Geographics':'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  map.current.attributionControl.addAttribution(base.current.options.attribution);
  base.current.setUrl(satellite?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}':'https://tile.openstreetmap.org/{z}/{x}/{y}.png');setTileError(false);
 },[satellite,ready]);
 useEffect(()=>{
  if(!ready||!map.current||!overlays.current)return;
  if(!leaflet.current)return;const L=leaflet.current!;
   const instance=map.current,group=overlays.current;group.clearLayers();setVisible(sites.filter(site=>instance.getBounds().contains(site.center as [number,number])).length);
   const ids=new Set(sites.map(site=>site.id));
   coverageSites.filter(site=>!ids.has(site.id)&&site.id!==selected).forEach(site=>L.circleMarker(site.center as [number,number],{radius:3,color:'#8c9b93',fillColor:'#aeb9ae',fillOpacity:.45,weight:0,interactive:false}).addTo(group));
   const displaySites=[...sites];if(selected&&!ids.has(selected))displaySites.push(getSite(selected));
   const colorFor=(site:Site)=>{const record=getRecord(site.id,context);return layer==='AEZ classes'?db.aezs.find(zone=>zone.id===site.aezId)!.color:layer==='Water stress'?(record.droughtRisk>=60?'#a36439':record.droughtRisk>=30?'#92743b':'#397f75'):(record.suitability>=85?'#28654a':record.suitability>=70?'#5f803f':'#8e703a');};
   function marker(site:Site){
    const record=getRecord(site.id,context),color=colorFor(site),value=layer==='AEZ classes'?site.aezId.replace('AEZ-',''):String(Math.round(layer==='Water stress'?record.droughtRisk:record.suitability));
    const element=document.createElement('div');element.className='search-pin-host';
    const button=document.createElement('button');button.type='button';button.className='search-map-pin'+(selected===site.id?' selected':'')+(hovered===site.id?' hovered':'')+(!ids.has(site.id)?' outside-results':'');button.style.setProperty('--pin-color',color);if(layer==='AEZ classes')button.style.color='#102a1a';button.textContent=value;
    const metric=layer==='AEZ classes'?site.aezId:layer==='Water stress'?`${value}/100 drought exposure`:`${value}/100 environmental fit`;
    button.setAttribute('aria-label',`Inspect ${site.name}, ${site.country}: ${metric}`);button.setAttribute('aria-pressed',String(selected===site.id));button.addEventListener('click',event=>{event.stopPropagation();callbacks.current.onSelect(site.id);setCluster([]);});
    button.addEventListener('mouseenter',()=>callbacks.current.onHover?.(site.id));button.addEventListener('mouseleave',()=>callbacks.current.onHover?.(null));element.appendChild(button);
    const label=document.createElement('span');label.className='search-pin-label';label.textContent=site.name;element.appendChild(label);
    const icon=L.divIcon({className:'search-marker',html:element,iconSize:[44,45],iconAnchor:[22,22]});
    L.marker(site.center as [number,number],{icon,keyboard:false,zIndexOffset:selected===site.id?1500:hovered===site.id?1000:100}).bindTooltip(`${site.name} · ${metric}`,{direction:'top',offset:[0,-18]}).addTo(group);
    if(zoom>=8){const cells=db.cells.filter(cell=>cell.locationId===site.id);if(cells.length){const extent=L.latLngBounds(cells.flatMap(cell=>cell.bounds as [number,number][]));L.rectangle(extent,{color,weight:selected===site.id?2:1,fillOpacity:.07,interactive:false}).addTo(group);}}
    if(grid&&zoom>=11)db.cells.filter(cell=>cell.locationId===site.id).forEach(cell=>L.rectangle(cell.bounds as [[number,number],[number,number]],{color,weight:.6,fillColor:color,fillOpacity:.18}).bindTooltip(`${cell.id} · synthetic 1 km sample`).on('click',event=>{L.DomEvent.stopPropagation(event);callbacks.current.onSelect(site.id);callbacks.current.onCell(cell.id);}).addTo(group));
   }
   const groups:{sites:Site[];x:number;y:number;country?:string}[]=[];
   if(zoom<=4&&context.region==='Worldwide'){
    const countries=new Map<string,Site[]>();displaySites.filter(site=>site.id!==selected).forEach(site=>countries.set(site.country,[...(countries.get(site.country)||[]),site]));countries.forEach((items,country)=>{
     const center:[number,number]=[items.reduce((sum,site)=>sum+site.center[0],0)/items.length,items.reduce((sum,site)=>sum+site.center[1],0)/items.length];const point=instance.latLngToContainerPoint(center);
     const nearby=groups.find(group=>Math.hypot(group.x-point.x,group.y-point.y)<105);
     if(nearby){nearby.sites.push(...items);nearby.country=undefined;}else groups.push({sites:items,x:point.x,y:point.y,country});
    });
   }else{
    displaySites.filter(site=>site.id!==selected).forEach(site=>{const point=instance.latLngToContainerPoint(site.center as [number,number]);const existing=groups.find(group=>Math.hypot(group.x-point.x,group.y-point.y)<84);if(existing)existing.sites.push(site);else groups.push({sites:[site],x:point.x,y:point.y});});
   }
   groups.forEach(cluster=>{
    if(cluster.sites.length===1){marker(cluster.sites[0]);return;}
    const aggregate=areaWeightedScore(cluster.sites.map(site=>({score:layer==='Water stress'?getRecord(site.id,context).droughtRisk:getRecord(site.id,context).suitability,areaHa:site.sampledAreaHa})));
    const metric=layer==='Water stress'?'drought exposure':'fit',value=aggregate.score===null?'—':String(Math.round(aggregate.score));
    const element=document.createElement('div');element.className='search-cluster-host';const button=document.createElement('button');button.type='button';button.className='search-map-cluster';
    const score=document.createElement('strong');score.textContent=value;button.appendChild(score);const count=document.createElement('small');count.textContent=cluster.sites.length+' sites';button.appendChild(count);
    button.title=`${value}/100 area-weighted ${metric} · ${cluster.sites.length} sites · ${aggregate.areaHa.toLocaleString()} sampled ha · ${db.periods.find(period=>period.id===context.period)?.label||context.period}`;
    button.setAttribute('aria-label',`Explore ${cluster.sites.length} sample areas${cluster.country?' in '+cluster.country:''}, ${value}/100 area-weighted ${metric}`);
    const numeric=aggregate.score??0;button.style.background=layer==='Water stress'?(numeric>=60?'#a36439':numeric>=30?'#92743b':'#397f75'):(numeric>=85?'#28654a':numeric>=70?'#5f803f':'#8e703a');
    button.addEventListener('click',event=>{event.stopPropagation();if(cluster.country)callbacks.current.onCountry(cluster.country);else setCluster(cluster.sites.map(site=>site.id));});element.appendChild(button);
    const label=document.createElement('span');const regions=[...new Set(cluster.sites.map(site=>site.region))],countries=[...new Set(cluster.sites.map(site=>site.country))];label.textContent=cluster.country||(regions.length===1?regions[0]:countries.length===1?countries[0]:countries.slice(0,2).join(' + ')+(countries.length>2?` +${countries.length-2}`:''));element.appendChild(label);
    const center:[number,number]=[cluster.sites.reduce((sum,site)=>sum+site.center[0],0)/cluster.sites.length,cluster.sites.reduce((sum,site)=>sum+site.center[1],0)/cluster.sites.length];
    L.marker(center,{icon:L.divIcon({className:'search-marker',html:element,iconSize:[64,68],iconAnchor:[32,32]}),keyboard:false}).addTo(group);
   });
   if(selected)marker(getSite(selected));
 },[ready,sites,coverageSites,selected,hovered,layer,context,zoom,viewportTick,grid]);
 const selectedSite=selected?getSite(selected):null,selectedRecord=selectedSite?getRecord(selectedSite.id,context):null;
 const clusterItems=cluster.map(getSite).filter(site=>sites.some(result=>result.id===site.id));
 function searchViewport(){if(!map.current)return;const bounds=map.current.getBounds();onBoundsSearch?.({south:bounds.getSouth(),north:bounds.getNorth(),west:bounds.getWest(),east:bounds.getEast()});userMoved.current=false;setMoved(false);setCluster([]);}
 return <div onKeyDown={event=>{if(event.key==='Escape'){setCluster([]);setLayers(false);setLegend(false);if(draw){cancelDrawing();onDrawCancel?.();}}}} ref={layerRoot} className={'map-shell search-map-shell '+(satellite?'satellite ':'')+(draw?'drawing':'')}>
  <div ref={root} className="leaflet-map" role="region" aria-label="Interactive crop search map"/>
  {!ready&&!failed&&<div className="map-loading" role="status"><MapIcon size={25}/><strong>Preparing the map</strong></div>}
  {failed&&<div className="map-loading" role="status"><MapIcon size={25}/><strong>Map could not load</strong><span>Search results remain available in the list.</span></div>}
  <div className="search-map-toolbar"><button className="map-layer-button" aria-label="Map layers" aria-expanded={layers} onClick={()=>setLayers(!layers)}><Layers size={15}/>{layer}</button><span className="search-map-summary" aria-live="polite">{sites.length} {sites.length===1?'match':'matches'}<span>· {visible} in view</span></span></div>
  {onBoundsSearch&&moved&&!draw&&<button className="search-this-area" onClick={searchViewport}><Search size={14}/>Search this area</button>}
  {areaActive&&<div className="map-area-filter"><span>Within map area</span><button aria-label="Clear map area filter" onClick={onClearArea}><X size={13}/></button></div>}
  {layers&&<div className="layer-popover popover"><p className="eyebrow">ANALYSIS LAYER</p>{['Suitability','AEZ classes','Water stress'].map(value=><button className={'layer-option '+(layer===value?'selected':'')} key={value} aria-pressed={layer===value} onClick={()=>{onLayer(value);setLayers(false);}}><span>{value}<small>{value==='Suitability'?'Environmental fit · higher is better':value==='Water stress'?'Drought exposure · lower is better':'Environmental classes, not a score'}</small></span>{layer===value&&<Check size={15}/>}</button>)}<hr/><button className="layer-option" role="switch" aria-checked={satellite} onClick={()=>setSatellite(!satellite)}><span>Satellite basemap<small>Esri and imagery partners</small></span><span className={'switch '+(satellite?'on':'')}/></button><button className="layer-option" role="switch" aria-checked={grid} onClick={()=>setGrid(!grid)}><span>Sample grid<small>Optional · appears at zoom 11+</small></span><span className={'switch '+(grid?'on':'')}/></button></div>}
  <div className="map-controls" role="group" aria-label="Map controls"><button title={expanded?'Exit expanded map':'Expand map'} aria-label={expanded?'Exit expanded map':'Expand map workspace'} onClick={onExpand}>{expanded?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button><span/><button aria-label="Zoom in" title="Zoom in" disabled={!ready||zoom>=15} onClick={()=>{programmatic.current=false;map.current?.zoomIn();}}><Plus size={17}/></button><button aria-label="Zoom out" title="Zoom out" disabled={!ready||zoom<=2} onClick={()=>{programmatic.current=false;map.current?.zoomOut();}}><Minus size={17}/></button><span/><button aria-label="Fit matching results" title="Fit matching results" disabled={!sites.length} onClick={()=>frame(sites,context.region==='Worldwide'&&sites.length>5?3:8)}><LocateFixed size={17}/></button></div>
  {!!clusterItems.length&&<section className="map-cluster-picker" aria-label="Cluster locations"><div><strong>{clusterItems.length} sample areas</strong><button className="icon-button" aria-label="Close sample group" onClick={()=>setCluster([])}><X size={15}/></button></div><button className="text-button" onClick={()=>frame(clusterItems,8)}>Fit this group<ArrowUpRight size={12}/></button><div>{clusterItems.map(site=><button key={site.id} onClick={()=>{onSelect(site.id);setCluster([]);}}><span>{site.name}<small>{site.region}</small></span><strong>{Math.round(getRecord(site.id,context).suitability)}<small>/100 fit</small></strong></button>)}</div></section>}
  {selectedSite&&selectedRecord&&!clusterItems.length&&<section className="map-selection-preview" aria-label="Selected map result"><div><strong>{selectedSite.name}</strong><button className="icon-button" aria-label="Clear map selection" onClick={onClearSelection}><X size={14}/></button></div><p>{selectedSite.country} · {Math.round(selectedRecord.suitability)}/100 fit</p>{!sites.some(site=>site.id===selected)&&<small>Outside the current filters</small>}<a href="#location-intelligence">View intelligence<ArrowUpRight size={12}/></a></section>}
  {!sites.length&&!draw&&ready&&<div className="map-no-results" role="status"><Search size={22}/><strong>No matching sample areas</strong><span>Adjust the filters or search a wider area.</span><div>{areaActive&&<button className="button secondary" onClick={onClearArea}>Clear map area</button>}<button className="button secondary" onClick={onResetFilters}>Reset filters</button></div></div>}
  {draw&&<div className="map-instruction"><span>Drag to select matching sample areas</span><button aria-label="Cancel area selection" onClick={()=>{cancelDrawing();onDrawCancel?.();}}><X size={15}/></button></div>}
  {tileError&&<div className="map-offline" role="status"><MapIcon size={14}/><span>Basemap unavailable. Results remain interactive.</span><button onClick={()=>{setTileError(false);base.current?.redraw();}}><RotateCcw size={13}/>Retry</button></div>}
  <div className="search-map-legend"><button aria-label="Map legend" aria-expanded={legend} onClick={()=>setLegend(!legend)}><Info size={13}/>{layer==='Water stress'?'Drought scale':layer==='AEZ classes'?'AEZ key':'Fit scale'}</button>{legend&&<div className="search-legend-content"><strong>{layer==='Water stress'?'Drought exposure /100':layer==='AEZ classes'?'Agro-ecological zones':'Environmental fit /100'}</strong>{layer==='AEZ classes'?<div className="search-aez-key">{db.aezs.filter(zone=>coverageSites.some(site=>site.aezId===zone.id)).map(zone=><span key={zone.id}><i style={{background:zone.color}}/>{zone.id}</span>)}</div>:(layer==='Water stress'?[['#397f75','Low · 0–29'],['#92743b','Moderate · 30–59'],['#a36439','High · 60–100']]:[['#8e703a','Below 70'],['#5f803f','Suitable · 70–84'],['#28654a','Highly suitable · 85–100']]).map(([color,label])=><span key={label}><i style={{background:color}}/>{label}</span>)}<p>Markers: matching samples<br/>Groups: sampled-area-weighted {layer==='Water stress'?'drought':'fit'} + site count<br/>Grey dots: other sample coverage</p></div>}</div>
 </div>;
}
