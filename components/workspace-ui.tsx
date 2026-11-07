"use client";
import SearchSelect from "./search-select";
import { useRef, useState } from "react";
import { matchesSearch } from "../lib/search";
import { Search, X, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function SearchField({ value, onChange, label, placeholder }: { value: string; onChange: (value: string) => void; label: string; placeholder?: string }) {
  return <div className="search-field">
    <Search size={16} aria-hidden="true" />
    <input type="search" aria-label={label} placeholder={placeholder || label + "…"} value={value} onChange={(e) => onChange(e.target.value)} />
    {value && <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onChange("")}><X size={15} /></button>}
  </div>;
}
export function SummaryStrip({ items }: { items: { label: string; value: string | number; icon: LucideIcon; detail?: string }[] }) {
  return <div className="summary-strip">{items.map(({ label, value, icon: Icon, detail }) => <div key={label} className="summary-stat">
    <span className="summary-icon"><Icon size={18} /></span><div><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
  </div>)}</div>;
}
export function NoResults({ subject, onReset }: { subject: string; onReset: () => void }) {
  return <div className="search-empty" role="status"><span><Search size={23} /></span><h3>No {subject} match</h3><p>Try a different search or clear the filters to see all {subject}.</p><button className="button secondary" onClick={onReset}>Clear search & filters<ArrowUpRight size={14} /></button></div>;
}
export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="filter-select"><span>{label}</span><SearchSelect aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</SearchSelect></label>;
}

export function CommandMenu({ items, query, onQuery }: { items: { label: string; sub: string; icon: LucideIcon; action: () => void }[]; query: string; onQuery: (value: string) => void }) {
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const results = items.filter((item) => matchesSearch(item.label + " " + item.sub, query));
  function move(index: number) {
    const next = Math.max(0, Math.min(results.length - 1, index));
    setActive(next);
    list.current?.querySelectorAll("button")[next]?.scrollIntoView?.({ block: "nearest" });
  }
  return <>
    <div className="command-search"><Search size={20} /><input autoFocus role="combobox" aria-label="Search workspace" aria-autocomplete="list" aria-expanded="true" aria-controls="workspace-search-results" aria-activedescendant={results.length ? `command-option-${active}` : undefined} placeholder="Search pages, projects, crops, locations…" value={query} onChange={(e) => { onQuery(e.target.value); setActive(0); }} onKeyDown={(e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); move(active + (e.key === "ArrowDown" ? 1 : -1)); }
      if (e.key === "Enter") { e.preventDefault(); results[active]?.action(); }
    }} /><kbd>ESC</kbd></div>
    <div ref={list} className="command-results" id="workspace-search-results" role="listbox" aria-label="Workspace search results">
      {results.map((item, index) => <button id={`command-option-${index}`} role="option" aria-selected={active === index} className={active === index ? "active" : ""} key={item.sub + item.label} onMouseMove={() => setActive(index)} onClick={item.action}><item.icon size={18} /><span>{item.label}<small>{item.sub}</small></span><ArrowUpRight size={14} /></button>)}
      {!results.length && <div className="search-empty"><Search size={24} /><h3>No results for “{query}”</h3><p>Try a crop, country, project name or action.</p></div>}
    </div>
    <div className="command-hints"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><small>{results.length} results</small></div>
  </>;
}
