"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap, LayerGroup, TileLayer } from "leaflet";
import { db, getRecord, Context, Site } from "../lib/model";
import { geographyLabel } from "../lib/geography";
import {
  Plus,
  Minus,
  LocateFixed,
  Layers,
  Check,
  Maximize2,
  Map as MapIcon,
} from "lucide-react";

export default function ExplorerMap({
  context,
  sites,
  selected,
  onSelect,
  onCell,
  layer,
  onLayer,
  zoomTo,
  draw,
  onDraw,
  onCountry,
}: {
  onCountry: (v: string) => void;
  context: Context;
  sites: Site[];
  selected: string | null;
  onSelect: (id: string) => void;
  onCell: (id: string) => void;
  layer: string;
  onLayer: (v: string) => void;
  zoomTo: number;
  draw: boolean;
  onDraw: (ids: string[]) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    map = useRef<LMap | null>(null),
    overlays = useRef<LayerGroup | null>(null),
    base = useRef<TileLayer | null>(null);
  const [ready, setReady] = useState(false),
    [layers, setLayers] = useState(false),
    [satellite, setSatellite] = useState(false),
    [tileError, setTileError] = useState(false),
    [zoom, setZoom] = useState(2);
  const countryCallback = useRef(onCountry);
  countryCallback.current = onCountry;
  const callback = useRef(onSelect);
  callback.current = onSelect;
  const cellCallback = useRef(onCell);
  cellCallback.current = onCell;
  const drawCallback = useRef(onDraw);
  drawCallback.current = onDraw;
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const sitesRef = useRef(sites);
  sitesRef.current = sites;
  useEffect(() => {
    let dead = false;
    import("leaflet").then((L) => {
      if (dead || !root.current) return;
      const m = L.map(root.current, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: true,
        minZoom: 2,
        maxZoom: 15,
      }).setView([18, 12], 2);
      map.current = m;
      base.current = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        },
      ).addTo(m);
      let errors = 0;
      base.current.on("tileerror", () => {
        errors++;
        if (errors > 8) setTileError(true);
      });
      m.on("zoomend", () => setZoom(m.getZoom()));
      overlays.current = L.layerGroup().addTo(m);
      L.control.scale({ position: "bottomright", imperial: false }).addTo(m);
      let start: any = null,
        box: any = null;
      m.on("mousedown", (e: any) => {
        if (!drawRef.current) return;
        start = e.latlng;
        m.dragging.disable();
        box = L.rectangle([start, start], {
          color: "#24684c",
          weight: 2,
          fillOpacity: 0.13,
        }).addTo(m);
      });
      m.on("mousemove", (e: any) => {
        if (start && box) box.setBounds(L.latLngBounds(start, e.latlng));
      });
      m.on("mouseup", (e: any) => {
        if (!start) return;
        const bounds = L.latLngBounds(start, e.latlng);
        drawCallback.current(
          sitesRef.current
            .filter((s) => bounds.contains(s.center as [number, number]))
            .map((s) => s.id),
        );
        start = null;
        if (box) {
          m.removeLayer(box);
          box = null;
        }
        m.dragging.enable();
      });
      const observer = new ResizeObserver(() => m.invalidateSize());
      observer.observe(root.current);
      (m as any)._observer = observer;
      setReady(true);
    });
    return () => {
      dead = true;
      if (map.current) {
        (map.current as any)._observer?.disconnect();
        map.current.remove();
        map.current = null;
      }
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current || !overlays.current) return;
    let active = true;
    import("leaflet").then((L) => {
      if (!active || !overlays.current) return;
      const group = overlays.current;
      group.clearLayers();
      sites.forEach((s) => {
        const o = getRecord(s.id, context);
        const aez = db.aezs.find((a) => a.id === s.aezId)!;
        const color =
          layer === "AEZ classes"
            ? aez.color
            : layer === "Water stress"
              ? o.droughtRisk > 40
                ? "#bc8d4d"
                : "#86a8b7"
              : o.suitability >= 85
                ? "#4a8263"
                : o.suitability >= 70
                  ? "#8eab69"
                  : "#d2bb71";
        const bounds = L.latLngBounds(
          [s.center[0] - 0.052, s.center[1] - 0.056],
          [s.center[0] + 0.052, s.center[1] + 0.056],
        );
        L.rectangle(bounds, {
          color,
          fillColor: color,
          weight: 1,
          fillOpacity: 0.16,
        })
          .on("click", () => callback.current(s.id))
          .addTo(group);
        db.cells
          .filter((c) => c.locationId === s.id)
          .forEach((cell) => {
            L.rectangle(cell.bounds as [[number, number], [number, number]], {
              color,
              weight: 0.5,
              fillColor: color,
              fillOpacity: layer === "Water stress" ? 0.35 : 0.28,
            })
              .on("click", () => {
                callback.current(s.id);
                cellCallback.current(cell.id);
              })
              .addTo(group);
          });
        if (zoom <= 4 && sites.length > 1) return;
        const score =
          layer === "Water stress"
            ? Math.round(o.droughtRisk)
            : Math.round(o.suitability);
        const icon = L.divIcon({
          className: "score-marker-wrap",
          html: `<div class="score-marker ${selected === s.id ? "selected" : ""}"><span>${layer === "AEZ classes" ? s.aezId.replace("AEZ-", "") : score}</span></div><div class="marker-label">${s.name}</div>`,
          iconSize: [54, 61],
          iconAnchor: [27, 30],
        });
        L.marker(s.center as [number, number], {
          icon,
          zIndexOffset: selected === s.id ? 1000 : 0,
        })
          .on("click", () => callback.current(s.id))
          .addTo(group);
      });
      if (zoom <= 4 && sites.length > 1) {
        const groups = new Map<string, Site[]>();
        sites.forEach((s) =>
          groups.set(s.country, [...(groups.get(s.country) || []), s]),
        );
        groups.forEach((items, country) => {
          const best = [...items].sort(
            (a, b) =>
              getRecord(b.id, context).suitability -
              getRecord(a.id, context).suitability,
          )[0];
          const lat = items.reduce((v, s) => v + s.center[0], 0) / items.length,
            lon = items.reduce((v, s) => v + s.center[1], 0) / items.length;
          const score = Math.round(getRecord(best.id, context).suitability);
          const icon = L.divIcon({
            className: "country-marker-wrap",
            html: `<div class="country-marker ${["Mali", "Turkey", "Pakistan"].includes(country) ? "label-above" : ""}"><span>${country}</span><strong>${layer === "AEZ classes" ? items.length + " areas" : score + "<small>/100 best fit</small>"}</strong><em>${items.length} sample ${items.length === 1 ? "area" : "areas"} · explore →</em></div>`,
            iconSize: [126, 73],
            iconAnchor: [63, 36],
          });
          L.marker([lat, lon], { icon })
            .bindTooltip(
              `Explore ${country} · ${items.length} sample areas · best synthetic fit ${score}/100`,
            )
            .on("click", () => countryCallback.current(country))
            .addTo(group);
        });
      }
    });
    return () => {
      active = false;
    };
  }, [ready, context, sites, selected, layer, zoom]);
  useEffect(() => {
    if (!ready || !map.current || !sites.length) return;
    import("leaflet").then((L) => {
      map.current?.fitBounds(
        L.latLngBounds(sites.map((s) => s.center as [number, number])),
        {
          padding: [85, 75],
          maxZoom: context.region === "Worldwide" ? 3 : 8,
          animate: true,
        },
      );
    });
  }, [ready, context.region]);
  useEffect(() => {
    if (!ready || !selected || !map.current) return;
    const s = db.locations.find((s) => s.id === selected);
    if (s && map.current.getZoom() < 6)
      map.current.flyTo(s.center as [number, number], 6, { duration: 0.7 });
    else if (s)
      map.current.panTo(s.center as [number, number], { animate: true });
  }, [selected, ready]);
  useEffect(() => {
    if (!ready || !selected || !map.current || !zoomTo) return;
    const s = db.locations.find((s) => s.id === selected);
    if (s) map.current.flyTo(s.center as [number, number], 12, { duration: 1 });
  }, [zoomTo, ready]);
  useEffect(() => {
    if (!ready || !base.current) return;
    base.current.setUrl(
      satellite
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    );
    const old = base.current.options.attribution;
    if (old) map.current?.attributionControl.removeAttribution(old);
    base.current.options.attribution = satellite
      ? "Tiles &copy; Esri, Maxar, Earthstar Geographics"
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    map.current?.attributionControl.addAttribution(
      base.current.options.attribution,
    );
  }, [satellite, ready]);
  function fit() {
    import("leaflet").then((L) => {
      if (sites.length)
        map.current?.fitBounds(
          L.latLngBounds(sites.map((s) => s.center as [number, number])),
          {
            padding: [70, 70],
            maxZoom: context.region === "Worldwide" ? 3 : 8,
          },
        );
    });
  }
  return (
    <div className={"map-shell " + (draw ? "drawing" : "")}>
      <div
        ref={root}
        className="leaflet-map"
        aria-label="Interactive crop suitability map"
      />
      <div className="map-top">
        <button className="map-layer-button" onClick={() => setLayers(!layers)}>
          <Layers size={16} />
          {layer}
          <span className="live-dot" />
        </button>
        <span className="map-area-label">
          {geographyLabel(context.region)}{" "}
          <span> / {sites.length} sample areas</span>
        </span>
      </div>
      {layers && (
        <div className="layer-popover popover">
          <p className="eyebrow">MAP LAYER</p>
          {["Suitability", "AEZ classes", "Water stress"].map((l) => (
            <button
              key={l}
              className="layer-option"
              onClick={() => {
                onLayer(l);
                setLayers(false);
              }}
            >
              <span>
                {l}
                <small>
                  {l === "AEZ classes"
                    ? "Environmental classes, not fit"
                    : l === "Water stress"
                      ? "Illustrative drought risk"
                      : "Crop–environment match"}
                </small>
              </span>
              {layer === l && <Check size={16} />}
            </button>
          ))}
          <hr />
          <button
            className="layer-option"
            onClick={() => setSatellite(!satellite)}
          >
            <span>
              Satellite basemap<small>Imagery © Esri and partners</small>
            </span>
            <span className={"switch " + (satellite ? "on" : "")} />
          </button>
        </div>
      )}
      <div className="map-controls">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => map.current?.zoomIn()}
        >
          <Plus size={18} />
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => map.current?.zoomOut()}
        >
          <Minus size={18} />
        </button>
        <span />
        <button
          title="Fit search region"
          aria-label="Fit search region"
          onClick={fit}
        >
          <LocateFixed size={18} />
        </button>
        {selected && (
          <button
            title="Inspect 1 km cells"
            aria-label="Inspect 1 km cells"
            onClick={() => {
              const s = db.locations.find((s) => s.id === selected);
              if (s) map.current?.flyTo(s.center as [number, number], 12);
            }}
          >
            <Maximize2 size={17} />
          </button>
        )}
      </div>
      {draw && (
        <div className="map-instruction">
          Drag a rectangle to select sampled locations
        </div>
      )}
      {tileError && (
        <div className="map-offline">
          <MapIcon size={14} /> Basemap unavailable. Sample locations remain
          interactive.
        </div>
      )}
      <div className="map-legend">
        <span>
          {layer === "AEZ classes"
            ? "AEZ classes"
            : layer === "Water stress"
              ? "Drought risk"
              : "Environmental suitability"}
        </span>
        {layer === "AEZ classes" ? (
          <div className="aez-legend">
            {db.aezs.map((a) => (
              <i key={a.id} style={{ background: a.color }} title={a.id} />
            ))}
          </div>
        ) : (
          <>
            <div
              className={
                "legend-gradient " + (layer === "Water stress" ? "water" : "")
              }
            />
            <div className="legend-ends">
              <small>{layer === "Water stress" ? "Low" : "Marginal"}</small>
              <small>
                {layer === "Water stress" ? "High" : "Highly suitable"}
              </small>
            </div>
          </>
        )}
        <p>Illustrative 1 × 1 km samples</p>
      </div>
    </div>
  );
}
