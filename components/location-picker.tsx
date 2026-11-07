"use client";
import { useEffect, useRef, useState } from "react";
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
import { db } from "../lib/model";
import { countries, geographyLabel } from "../lib/geography";

export default function LocationPicker({
  value,
  onChange,
  onLocate,
  locating = false,
  method = "",
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onLocate: () => void;
  locating?: boolean;
  method?: string;
  compact?: boolean;
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
  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };
  const regionMatches = [...new Set(db.locations.map((s) => s.region))].filter(
    (r) => r.toLowerCase().includes(query.toLowerCase()),
  );
  const matches = db.locations.filter((s) =>
    (s.name + " " + s.region + " " + s.country + " " + s.aezId)
      .toLowerCase()
      .includes(query.toLowerCase()),
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
        aria-label={`Search region: ${geographyLabel(value)}`}
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
          role="dialog"
          aria-label="Choose search location"
        >
          <div className="location-picker-heading">
            <strong>Where would you like to explore?</strong>
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
          {!query && (
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
              {query ? "MATCHING COUNTRIES" : "COUNTRIES WITH SAMPLE COVERAGE"}
            </div>
            {countries
              .filter((c) => c.toLowerCase().includes(query.toLowerCase()))
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
            {query && regionMatches.length > 0 && (
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
            {query && matches.length > 0 && (
              <>
                <div className="eyebrow">SAMPLE LOCATIONS</div>
                {matches.slice(0, 10).map((s) => (
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
              !countries.some((c) =>
                c.toLowerCase().includes(query.toLowerCase()),
              ) && (
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
