"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  MapPin,
  ChevronDown,
  Search,
  Globe2,
  LocateFixed,
  Check,
  ArrowRight,
  X,
  LoaderCircle,
} from "lucide-react";
import { matchesSearch } from "../lib/search";
import { db } from "../lib/model";
import { countries, geographyLabel } from "../lib/geography";

export default function LocationPicker({
  value,
  onChange,
  onLocate,
  locating = false,
  method = "",
  compact = false,
  sampleOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onLocate: () => void;
  locating?: boolean;
  method?: string;
  compact?: boolean;
  sampleOnly?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 390, maxHeight: 500 });
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = root.current?.querySelector(".location-picker-trigger")?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(390, window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 20;
      const above = rect.top - 20;
      const useBelow = below >= 300 || below >= above;
      const maxHeight = Math.max(120, Math.min(580, useBelow ? below : above));
      setPosition({ top: useBelow ? rect.bottom + 8 : Math.max(12, rect.top - maxHeight - 8), left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), width, maxHeight });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);
  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
    root.current?.querySelector<HTMLButtonElement>(".location-picker-trigger")?.focus();
  };
  const regionMatches = [...new Set(db.locations.map((s) => s.region))].filter(
    (r) => matchesSearch(r, query),
  );
  const matches = db.locations.filter((s) =>
    matchesSearch(s.name + " " + s.region + " " + s.country + " " + s.aezId, query),
  );
  return (
    <div className={"location-picker " + (compact ? "compact" : "")} ref={root}>
      <button
        type="button"
        className="location-picker-trigger"
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={sampleOnly ? "Select land" : `Search region: ${geographyLabel(value)}`}
      >
        <span className="picker-leading">
          {value === "Worldwide" ? <Globe2 size={18} /> : <MapPin size={18} />}
        </span>
        <span>
          <strong>{geographyLabel(value)}</strong>
          {compact && (
            <small>{method || "Country, region or sample location"}</small>
          )}
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="location-picker-menu popover"
          style={{ position: "fixed", ...position, overflowY: "auto" }}
          role="dialog"
          aria-label="Choose search location"
          onKeyDown={(event) => {
            const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>(".picker-options button, .picker-nearby, .picker-world") || []);
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const next = index < 0 ? (event.key === "ArrowDown" ? 0 : buttons.length - 1) : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
              buttons[next]?.focus(); buttons[next]?.scrollIntoView({block:"nearest"});
            }
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); root.current?.querySelector<HTMLButtonElement>(".location-picker-trigger")?.focus(); }
          }}
        >
          <div className="location-picker-heading">
            <strong>{sampleOnly ? "Find your sample location" : "Where would you like to explore?"}</strong>
            <button
              type="button"
              aria-label="Close location picker"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
          <div className="location-picker-search">
            <Search size={17} />
            <input
              ref={input}
              aria-label="Search countries, regions and locations"
              placeholder="Country, region, city or AEZ…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear location search"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {!query && !sampleOnly && (
            <>
              <button
                type="button"
                className="picker-nearby"
                onClick={() => {
                  onLocate();
                  setOpen(false);
                }}
              >
                {locating ? (
                  <LoaderCircle className="spin" size={19} />
                ) : (
                  <LocateFixed size={19} />
                )}
                <span>
                  <strong>Use my current location</strong>
                  <small>
                    Find nearby sample coverage · browser permission
                  </small>
                </span>
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                className={
                  "picker-world " + (value === "Worldwide" ? "selected" : "")
                }
                onClick={() => choose("Worldwide")}
              >
                <Globe2 size={20} />
                <span>
                  <strong>Explore worldwide</strong>
                  <small>
                    Suitable origins across {countries.length} countries
                  </small>
                </span>
                {value === "Worldwide" ? (
                  <Check size={17} />
                ) : (
                  <ArrowRight size={15} />
                )}
              </button>
            </>
          )}
          <div className="picker-options">
            <div className="eyebrow">
              {sampleOnly ? `${matches.length} SAMPLE LOCATIONS` : query ? "MATCHING COUNTRIES" : "COUNTRIES WITH SAMPLE COVERAGE"}
            </div>
            {(sampleOnly ? [] : countries)
              .filter((c) => matchesSearch(c, query))
              .map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => choose(c)}
                  className={value === c ? "selected" : ""}
                >
                  <MapPin size={14} />
                  <span>
                    {c}
                    <small>
                      {db.locations.filter((s) => s.country === c).length}{" "}
                      sample areas
                    </small>
                  </span>
                  {value === c && <Check size={15} />}
                </button>
              ))}
            {query && !sampleOnly && regionMatches.length > 0 && (
              <>
                <div className="eyebrow">REGIONS</div>
                {regionMatches.slice(0, 8).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => choose(r)}
                    className={value === r ? "selected" : ""}
                  >
                    <MapPin size={14} />
                    <span>
                      {r}
                      <small>
                        {db.locations.find((s) => s.region === r)?.country} ·{" "}
                        {db.locations.filter((s) => s.region === r).length}{" "}
                        sample areas
                      </small>
                    </span>
                    {value === r && <Check size={15} />}
                  </button>
                ))}
              </>
            )}
            {(query || sampleOnly) && matches.length > 0 && (
              <>
                <div className="eyebrow">SAMPLE LOCATIONS</div>
                {matches.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => choose("site:" + s.id)}
                    className={value === "site:" + s.id ? "selected" : ""}
                  >
                    <MapPin size={14} />
                    <span>
                      {s.name}
                      <small>
                        {s.region} · {s.country} · {s.aezId}
                      </small>
                    </span>
                    {value === "site:" + s.id && <Check size={15} />}
                  </button>
                ))}
              </>
            )}
            {query &&
              !matches.length &&
              (sampleOnly || !countries.some((c) => matchesSearch(c, query))) && (
                <div className="picker-no-results">
                  No sample coverage found. Search another country or choose
                  Worldwide.
                </div>
              )}
          </div>
          <div className="picker-note">
            Samples show environmental possibilities, not complete country
            coverage.{" "}
            {method && <span>Current default: {method.toLowerCase()}.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
