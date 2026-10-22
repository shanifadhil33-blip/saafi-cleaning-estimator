"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MutableRefObject, type Ref } from "react";
import { createPortal } from "react-dom";
import {
  countryByIso, displayName, flagSrc, listCountries, resolveCountry,
  type PhoneLang,
} from "@/lib/countries";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
const FIRST_SCREEN = 8;

type Box = { top: number; left: number; width: number; height: number };

export function PhoneField({
  iso, lead, onIso, value, onChange, invalid, error, label, searchLabel, countryLabel, emptyLabel, lang, inputRef, onEnter,
}: {
  iso: string;
  /** Page market. Stays at the top of the list even after the visitor picks another country. */
  lead?: string;
  onIso: (iso: string) => void;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  error?: string;
  label: string;
  searchLabel: string;
  countryLabel: string;
  emptyLabel: string;
  lang: PhoneLang;
  inputRef?: Ref<HTMLInputElement>;
  onEnter?: () => void;
}) {
  const country = countryByIso(iso) ?? resolveCountry("AE");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [loadedTick, setLoadedTick] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const localRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(new Set<string>());
  const listed = useMemo(() => listCountries(query, lang, lead), [query, lang, lead]);

  if (open) {
    for (const c of listed.countries.slice(0, FIRST_SCREEN)) loadedRef.current.add(c.iso);
  }

  const setInput = (node: HTMLInputElement | null) => {
    localRef.current = node;
    if (typeof inputRef === "function") inputRef(node);
    else if (inputRef) (inputRef as MutableRefObject<HTMLInputElement | null>).current = node;
  };

  useIso(() => {
    if (!open) return;
    const place = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const margin = 8;
      const maxH = 300;
      const below = window.innerHeight - r.bottom - margin;
      const above = r.top - margin;
      const up = below < 200 && above > below;
      const height = Math.max(160, Math.min(maxH, (up ? above : below) - 6));
      const top = up ? Math.max(margin, r.top - height - 6) : r.bottom + 6;
      setBox({ top, left: Math.max(margin, r.left), width: r.width, height });
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = scrollRef.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const next = (entry.target as HTMLElement).getAttribute("data-iso") || "";
        if (next && !loadedRef.current.has(next)) {
          loadedRef.current.add(next);
          changed = true;
        }
      }
      if (changed) setLoadedTick((n) => n + 1);
    }, { root, rootMargin: "40px" });
    root.querySelectorAll<HTMLElement>(".cc-opt").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [open, query, box, lang, lead]);

  useEffect(() => {
    if (!open) return;
    popRef.current?.querySelector<HTMLElement>("[data-active=true]")?.scrollIntoView({ block: "nearest" });
  }, [active, open, query]);

  const pick = (next: string) => {
    onIso(next);
    setOpen(false);
    setQuery("");
    requestAnimationFrame(() => localRef.current?.focus());
  };

  const onSearchKey = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(listed.countries.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); const c = listed.countries[active]; if (c) pick(c.iso); }
  };

  const list = open && box && typeof document !== "undefined" ? createPortal(
    <div className="cc-pop" id="ccList" role="listbox" aria-label={countryLabel} ref={popRef} style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.height }}>
      <input ref={searchRef} className="cc-search" dir="auto" value={query} placeholder={searchLabel} aria-label={searchLabel} autoComplete="off" spellCheck={false} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onSearchKey} />
      <div className="cc-scroll" ref={scrollRef} data-loaded={loadedTick}>
        {listed.countries.length === 0 ? <p className="cc-empty">{emptyLabel}</p> : listed.countries.map((c, i) => {
          const ready = loadedRef.current.has(c.iso);
          return (
            <span key={c.iso} className="cc-row">
              {i === listed.priorityCount && listed.priorityCount > 0 ? <span className="cc-gap" /> : null}
              <button type="button" role="option" className="cc-opt" data-iso={c.iso} data-active={i === active || undefined} aria-selected={c.iso === country.iso} onMouseEnter={() => setActive(i)} onClick={() => pick(c.iso)}>
                {ready ? <img className="flag" alt="" src={flagSrc(c.iso)} width={20} height={15} /> : <span className="flag" data-flag="wait" />}
                <span className="nm" dir="auto">{displayName(c, lang)}</span>
                <span className="dd" dir="ltr">+{c.dial}</span>
              </button>
            </span>
          );
        })}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div className="f phone-f">
      <label htmlFor="fMobile" id="phoneLbl">{label}</label>
      <div className={`phone${open ? " open" : ""}`} dir="ltr" ref={wrapRef} data-invalid={invalid || undefined}>
        <button type="button" className="cc" id="ccBtn" data-iso={country.iso} data-dial={country.dial} aria-haspopup="listbox" aria-expanded={open} aria-controls="ccList" aria-label={`${countryLabel}, ${displayName(country, lang)}, +${country.dial}`} onClick={() => { if (open) setOpen(false); else { setQuery(""); setActive(0); setBox(null); setOpen(true); } }}>
          <img className="flag" alt="" src={flagSrc(country.iso)} width={20} height={15} />
          <span className="dial">+{country.dial}</span>
          <svg className="chev" width="12" height="12" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5.2l4 3.8 4-3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <input
          id="fMobile"
          name="mobile"
          ref={setInput}
          className="phone-in"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="next"
          dir="ltr"
          placeholder={country.example}
          aria-labelledby="phoneLbl"
          aria-required="true"
          aria-invalid={invalid || undefined}
          aria-describedby={error ? "mobileErr" : undefined}
          maxLength={24}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); onEnter?.(); } }}
        />
      </div>
      {error ? <p className="err show" id="mobileErr">{error}</p> : null}
      {list}
    </div>
  );
}
