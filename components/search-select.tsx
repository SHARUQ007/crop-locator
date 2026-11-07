"use client";
import { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { matchesSearch } from "../lib/search";

type Option = { value: string; label: string; group?: string; disabled?: boolean };
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}
function collect(children: ReactNode, group?: string): Option[] {
  const options: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{value?: string; children?: ReactNode; label?: string; disabled?: boolean}>(child)) return;
    if (child.type === "option") options.push({ value: String(child.props.value ?? textOf(child.props.children)), label: textOf(child.props.children), group, disabled: child.props.disabled });
    else if (child.type === "optgroup" || child.type === Fragment) options.push(...collect(child.props.children, child.props.label || group));
  });
  return options;
}

/** Searchable, keyboard-operated select with a native form value retained. */
export default function SearchSelect({ children, className = "", onChange, value, defaultValue, disabled, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = collect(children);
  const [internal, setInternal] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const current = String(value ?? internal);
  const chosen = options.find((option) => option.value === current);
  const [open, setOpen] = useState(false), [query, setQuery] = useState(""), [active, setActive] = useState(0);
  const [bounds, setBounds] = useState({ top:0, left:0, width:280, height:320 });
  const [host, setHost] = useState<HTMLElement | null>(null), [label, setLabel] = useState(props["aria-label"] || "Choose an option");
  const trigger = useRef<HTMLButtonElement>(null), native = useRef<HTMLSelectElement>(null), popup = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const filtered = options.filter((option) => matchesSearch(option.label + " " + (option.group || ""), query));
  useEffect(() => {
    setHost(trigger.current?.closest("dialog") || document.body);
    const parent = trigger.current?.closest("label");
    if (!props["aria-label"] && parent) setLabel(Array.from(parent.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(" ").trim() || "Choose an option");
  }, [props["aria-label"]]);
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = trigger.current!.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 270), window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 16, above = rect.top - 16;
      const height = Math.max(140, Math.min(360, Math.max(below, above)));
      setBounds({left:Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top:below >= Math.min(260, height) ? rect.bottom + 6 : Math.max(12, rect.top - height - 6), width, height});
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    input.current?.focus();
    const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); document.removeEventListener("pointerdown", outside); };
  }, [open]);
  function choose(option: Option) {
    if (option.disabled) return;
    setInternal(option.value);
    if (native.current) {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setter?.call(native.current, option.value);
      native.current.dispatchEvent(new Event("change", { bubbles:true }));
    }
    setOpen(false); trigger.current?.focus();
  }
  function show() { if (disabled) return; setQuery(""); setActive(Math.max(0, options.findIndex((option) => option.value === current))); setOpen(true); }
  function step(next: number) {
    const count = filtered.length;
    if (!count) return;
    let index = (next + count) % count;
    for (let i=0; i<count && filtered[index].disabled; i++) index = (index + 1) % count;
    setActive(index);
    popup.current?.querySelectorAll<HTMLElement>("[role='option']")[index]?.scrollIntoView?.({block:"nearest"});
  }
  return <span className={"custom-select " + className}>
    <select {...props} className="select-native" tabIndex={-1} aria-hidden="true" value={current} disabled={disabled} ref={native} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setInternal(event.target.value); onChange?.(event); }}>{children}</select>
    <button ref={trigger} type="button" role="combobox" className="select-trigger" disabled={disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} onClick={() => open ? setOpen(false) : show()} onKeyDown={(event) => { if (["ArrowDown","ArrowUp","Enter"," "].includes(event.key)) { event.preventDefault(); show(); } }}><span>{chosen?.label || "Choose an option"}</span><ChevronDown size={15} /></button>
    {open && host && createPortal(<div ref={popup} className="select-popup" style={{position:"fixed",left:bounds.left,top:bounds.top,width:bounds.width,maxHeight:bounds.height}} onKeyDown={(event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); step(active + (event.key === "ArrowDown" ? 1 : -1)); }
      if (event.key === "Home" && !query) { event.preventDefault(); step(0); }
      if (event.key === "End" && !query) { event.preventDefault(); step(filtered.length - 1); }
      if (event.key === "Enter") { event.preventDefault(); if (filtered[active]) choose(filtered[active]); }
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
      if (event.key === "Tab") setOpen(false);
    }}>
      <div className="select-search"><Search size={15} /><input ref={input} role="combobox" aria-label={`Search ${label.toLowerCase()} options`} aria-expanded="true" aria-controls={listId} aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} placeholder="Type to filter options…" />{query && <button type="button" aria-label="Clear option search" onClick={() => { setQuery(""); setActive(0); }}><X size={14} /></button>}</div>
      <div className="select-options" id={listId} role="listbox" aria-label={label}>
        {filtered.map((option, index) => <Fragment key={option.value}>{option.group && filtered[index-1]?.group !== option.group && <div className="select-group">{option.group}</div>}<button id={`${listId}-${index}`} type="button" role="option" tabIndex={-1} aria-selected={current === option.value} aria-disabled={option.disabled} className={(active === index ? "highlighted " : "") + (current === option.value ? "selected" : "")} onMouseMove={() => setActive(index)} onClick={() => choose(option)}><span>{option.label}</span>{current === option.value && <Check size={16} />}</button></Fragment>)}
        {!filtered.length && <div className="select-empty">No options match “{query}”.<button type="button" onClick={() => setQuery("")}>Clear search</button></div>}
      </div>
      <div className="select-hint">{filtered.length} options<span>↑ ↓ navigate · ↵ select</span></div>
    </div>,host)}
  </span>;
}
