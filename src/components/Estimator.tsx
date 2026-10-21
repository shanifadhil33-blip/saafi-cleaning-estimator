"use client";
/* Estimator UI, ported from Claude's demo page: same markup, spacing and motion, in React.
   Kept from ours: phone split sheet with handle, EN/AR/UR with RTL, WhatsApp booking, no brand, /c/[slug] config.
   Added: home types (studio, apartment, townhouse, villa, penthouse), GCC bedroom wording, maid's room, sq ft or sq m, pool for villas. */
import dynamic from "next/dynamic";
import { AnimatePresence, LayoutGroup, MotionConfig, animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { STR, MORE, REAL, arBaths, arFloors, type Lang } from "@/lib/strings";
import { KINDS, SQM, autoSize, extrasFor, fitKind, initial, isClosed, maidAllowed, quote, refCode, slots, switchKind, waUrl, waWebUrl, type CleanType, type Company, type HomeKind, type State } from "@/lib/quote";

const HouseCanvas = dynamic(() => import("./House"), { ssr: false });
const EASE = [0.22, 1, 0.36, 1] as const;
const nf = new Intl.NumberFormat("en-US");
const fmt = (n: number) => nf.format(Math.round(n));
const LANGS: { id: Lang; label: string }[] = [{ id: "en", label: "EN" }, { id: "hi", label: "हिं" }, { id: "ur", label: "اردو" }, { id: "ar", label: "عربي" }];
const store = { get: (k: string) => { try { return localStorage.getItem("estimator." + k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem("estimator." + k, v); } catch { /* off */ } } };
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

function usePhone() {
  const [p, setP] = useState(false);
  useIso(() => { const m = matchMedia("(max-width: 820px)"); const on = () => setP(m.matches); on(); m.addEventListener("change", on); return () => m.removeEventListener("change", on); }, []);
  return p;
}
function useCount(v: number) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(v); const cur = useRef(v);
  useEffect(() => {
    if (reduce) { cur.current = v; setShown(v); return; }
    const a = cur.current, t0 = performance.now(); let raf = 0;
    const step = (now: number) => { const k = Math.min(1, (now - t0) / 520), e = 1 - Math.pow(1 - k, 3); cur.current = a + (v - a) * e; setShown(k < 1 ? Math.round(cur.current / 5) * 5 : v); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [v, reduce]);
  return shown;
}

function FitPrice({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      if (el.clientWidth < 8) return;
      const max = 20, min = 12;
      let size = max;
      el.style.fontSize = size + "px";
      while (size > min && el.scrollWidth > el.clientWidth + 1) {
        size -= 0.5;
        el.style.fontSize = size + "px";
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [text]);
  return <span className="price" data-price ref={ref}>{text}</span>;
}
function LangSwitch({ lang, setLang, className }: { lang: Lang; setLang: (l: Lang) => void; className: string }) {
  return (
    <div className={`lang ${className}`} role="group" aria-label="Language">
      {LANGS.map((x) => <button key={x.id} type="button" lang={x.id} data-lang={x.id} aria-pressed={lang === x.id} onClick={() => setLang(x.id)}>{x.label}</button>)}
    </div>
  );
}
const Chev = ({ s = 14 }: { s?: number }) => <svg className="chev" width={s} height={s} viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5.2l4 3.8 4-3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const WaIcon = () => <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5a7.5 7.5 0 0 0-6.5 11.2L2.6 17.4l3.8-1a7.5 7.5 0 1 0 3.6-13.9Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
const Tick = () => <span className="tick" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
function Reveal({ open, children, id }: { open: boolean; children: React.ReactNode; id?: string }) {
  return <div className={`reveal${open ? " open" : ""}`} id={id}><div>{children}</div></div>;
}

function Seg<T extends string | number>({ id, label, value, options, onPick, dir, className = "" }: { id: string; label: string; value: T; options: { v: T; node: React.ReactNode; disabled?: boolean }[]; onPick: (v: T) => void; dir: string; className?: string }) {
  const keys = (e: React.KeyboardEvent) => {
    const ok = options.filter((o) => !o.disabled); const i = ok.findIndex((o) => o.v === value);
    const fwd = e.key === "ArrowDown" || e.key === (dir === "rtl" ? "ArrowLeft" : "ArrowRight"), back = e.key === "ArrowUp" || e.key === (dir === "rtl" ? "ArrowRight" : "ArrowLeft");
    if (!fwd && !back) return; e.preventDefault();
    const n = ok[(i + (fwd ? 1 : -1) + ok.length) % ok.length]; onPick(n.v);
    requestAnimationFrame(() => (document.querySelector(`#${id} [data-v="${n.v}"]`) as HTMLElement | null)?.focus());
  };
  return (
    <LayoutGroup id={id}>
      <div className={`seg ${className}`} id={id} role="radiogroup" aria-label={label} onKeyDown={keys}>
        {options.map((o) => (
          <button key={String(o.v)} type="button" role="radio" data-v={o.v} aria-checked={o.v === value} tabIndex={o.v === value ? 0 : -1} disabled={o.disabled} onClick={() => onPick(o.v)}>
            {o.v === value && <motion.span layoutId="thumb" className="seg-thumb" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
            <span className="seg-lbl">{o.node}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}
function Roll({ v, dir }: { v: string; dir: number }) {
  return (
    <span className="roll" aria-live="polite">
      <AnimatePresence initial={false} custom={dir}>
        <motion.span key={v} custom={dir} variants={{ in: (d: number) => ({ y: `${d * 90}%`, opacity: 0 }), show: { y: 0, opacity: 1 }, out: (d: number) => ({ y: `${-d * 90}%`, opacity: 0 }) }} initial="in" animate="show" exit="out" transition={{ duration: 0.38, ease: EASE }}>{v}</motion.span>
      </AnimatePresence>
    </span>
  );
}
function Stepper({ id, label, value, show, min, max, onStep, fewer, more }: { id: string; label: string; value: number; show: string; min: number; max: number; onStep: (d: number) => void; fewer: string; more: string }) {
  const prev = useRef(value); const dir = value >= prev.current ? 1 : -1; useEffect(() => { prev.current = value; }, [value]);
  return (
    <div className="stepper" role="group" aria-labelledby={id} data-key={id}>
      <button type="button" className="step-btn" aria-label={`${fewer} ${label}`} disabled={value <= min} onClick={() => onStep(-1)}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>
      <Roll v={show} dir={dir} />
      <button type="button" className="step-btn" aria-label={`${more} ${label}`} disabled={value >= max} onClick={() => onStep(1)}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>
    </div>
  );
}

export default function Estimator({ company: c }: { company: Company }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [s, setRaw] = useState<State>(() => initial(c));
  const [unit, setUnit] = useState<"ft" | "m">("ft");
  const [extrasOpen, setExtrasOpen] = useState(false), [detailsOpen, setDetailsOpen] = useState(false);
  const [booking, setBooking] = useState<null | { x: number; y: number }>(null);
  const [sizeText, setSizeText] = useState<string | null>(null);
  const phone = usePhone();
  const t = { ...STR[lang], ...MORE[lang], ...REAL[lang] };
  const set = useCallback((f: (p: State) => State) => setRaw((p) => fitKind(c, f(p))), [c]);
  const K = c.kinds[s.kind];
  const brand = (c.brand as Record<string, string>)[lang] || c.brand.en || "";
  const q = useMemo(() => quote(c, s), [c, s]);
  const price = useCount(q.total);
  const money = (n: number) => t.money(fmt(n));

  useEffect(() => {
    const u = new URLSearchParams(location.search).get("lang"), st = store.get("lang");
    const l = (["en", "ar", "ur", "hi"] as Lang[]).find((x) => x === u) ?? (["en", "ar", "ur", "hi"] as Lang[]).find((x) => x === st);
    if (l) setLangState(l);
    if (store.get("unit") === "m") setUnit("m");
  }, []);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = STR[lang].dir; document.title = brand ? `${t.title} | ${brand}` : t.title; }, [lang, brand, t.title]);
  const setLang = (l: Lang) => { setLangState(l); store.set("lang", l); };

  /* sizes in the chosen unit */
  const toU = (sq: number) => (unit === "m" ? Math.round(sq * SQM) : sq);
  const uName = unit === "m" ? t.sqm : t.sqft;
  const sizeStr = (sq: number) => `${fmt(toU(sq))} ${uName}`;
  const bedsShow = (n: number) => t.bedsLabel(n);
  const bathStr = (n: number) => (lang === "ar" ? arBaths(n) : lang === "ur" ? `${n} باتھ روم` : lang === "hi" ? `${n} बाथरूम` : `${n} bath`);
  const homeTitle = typeof t.kindHome[s.kind] === "function" ? t.kindHome[s.kind](s.floors) : t.kindHome[s.kind];
  const sep = lang === "en" || lang === "hi" ? ", " : "، ";
  const sub = [sizeStr(s.sqft), bedsShow(s.beds) + (s.maid ? ` + ${t.maid}` : ""), bathStr(s.baths), lang === "en" ? t.typeLong[s.type].toLowerCase() : t.typeLong[s.type]].join(sep);
  const homeLine = [t.kinds[s.kind], sizeStr(s.sqft), lang === "ar" ? arFloors(s.floors) : lang === "ur" ? `${s.floors} ${s.floors === 1 ? "منزل" : "منزلیں"}` : lang === "hi" ? `${s.floors} फ्लोर` : `${s.floors} ${s.floors === 1 ? "floor" : "floors"}`, bedsShow(s.beds), bathStr(s.baths), ...(s.maid ? [t.maid] : [])].join(sep);
  const exName = (k: string) => t.ex[k] ?? t.ex2[k] ?? k;
  const range = (a: number, b: number) => t.range(money(a), lang === "en" || lang === "hi" ? fmt(b) : money(b));

  /* sheet (phone) */
  const sheetRef = useRef<HTMLElement>(null), scrollRef = useRef<HTMLDivElement>(null), barRef = useRef<HTMLDivElement>(null), topRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null), stageRef = useRef<HTMLDivElement>(null), sumRef = useRef<HTMLDivElement>(null);
  const sheet = useRef({ y: 0, snap: "half" as "full" | "half" | "peek", drag: null as null | { id: number; y0: number; s0: number; moved: boolean; last: number; t: number; v: number } });
  const [dragging, setDragging] = useState(false);
  const reduce = useReducedMotion();
  const snaps = useCallback(() => {
    const vh = window.innerHeight, bar = barRef.current?.offsetHeight || 76, top = (topRef.current?.offsetHeight || 0) + 8;
    const full = Math.max(top, Math.round(vh * 0.09));
    /* Title row saved ~52px. The shorter booking bar frees about 28px more for the sheet, still leaving the house fully in view. */
    const half = Math.round(vh * 0.5) - 80, peek = Math.max(half + 60, Math.round(vh - bar - 150));
    return { full, half, peek };
  }, []);
  const apply = useCallback((y: number, animate: boolean) => {
    const el = sheetRef.current; if (!el) return; sheet.current.y = y;
    el.style.transition = animate && !reduce ? `transform 460ms cubic-bezier(.22,1,.36,1)` : "none";
    el.style.transform = `translate3d(0, ${y}px, 0)`;
  }, [reduce]);
  const pad = useCallback(() => { const sn = snaps(), el = sheetRef.current, sc = scrollRef.current; if (!el || !sc) return; el.style.setProperty("--sheet-full", sn.full + "px"); sc.style.paddingBottom = Math.max(0, sheet.current.y - sn.full) + (barRef.current?.offsetHeight || 76) + 28 + "px"; }, [snaps]);
  const go = useCallback((name: "full" | "half" | "peek", animate = true) => { sheet.current.snap = name; apply(snaps()[name], animate); pad(); if (name === "peek" && scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: "smooth" }); }, [apply, snaps, pad]);
  useIso(() => {
    if (!phone) { const el = sheetRef.current; if (el) { el.style.transform = ""; el.style.transition = ""; } if (scrollRef.current) scrollRef.current.style.paddingBottom = ""; return; }
    go(sheet.current.snap, false);
    const r = () => go(sheet.current.snap, false); addEventListener("resize", r); return () => removeEventListener("resize", r);
  }, [phone, go]);
  const hDown = (e: React.PointerEvent) => { if (!phone) return; sheet.current.drag = { id: e.pointerId, y0: e.clientY, s0: sheet.current.y, moved: false, last: e.clientY, t: performance.now(), v: 0 }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDragging(true); };
  const hMove = (e: React.PointerEvent) => {
    const d = sheet.current.drag; if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y0; if (Math.abs(dy) > 4) d.moved = true;
    const sn = snaps(); let ny = d.s0 + dy;
    if (ny < sn.full) ny = sn.full - (sn.full - ny) * 0.25; if (ny > sn.peek) ny = sn.peek + (ny - sn.peek) * 0.25;
    const now = performance.now(), dt = Math.max(1, now - d.t); d.v = 0.7 * d.v + 0.3 * ((e.clientY - d.last) / dt); d.last = e.clientY; d.t = now;
    apply(ny, false);
  };
  const hUp = (e: React.PointerEvent) => {
    const d = sheet.current.drag; if (!d || e.pointerId !== d.id) return; setDragging(false);
    const sn = snaps(), cur = sheet.current.snap;
    if (!d.moved) go(cur === "full" ? "half" : cur === "half" ? "full" : "half");
    else { const target = sheet.current.y + Math.max(-80, Math.min(80, d.v * 180)); const best = (Object.entries(sn) as [typeof cur, number][]).sort((a, b) => Math.abs(a[1] - target) - Math.abs(b[1] - target))[0][0]; go(best); }
    sheet.current.drag = null;
  };
  const hKey = (e: React.KeyboardEvent) => { const cur = sheet.current.snap; if (e.key === "ArrowUp") { e.preventDefault(); go(cur === "peek" ? "half" : "full"); } if (e.key === "ArrowDown") { e.preventDefault(); go(cur === "full" ? "half" : "peek"); } };

  /* camera insets: the house sits in the part of the stage that UI does not cover */
  const insets = useCallback(() => {
    const st = stageRef.current, h = headRef.current; if (!st) return { top: 0, bottom: 0 };
    const sr = st.getBoundingClientRect(), top = h ? h.getBoundingClientRect().bottom - sr.top + 10 : 0;
    if (phone) { const sy = sheetRef.current ? sheetRef.current.getBoundingClientRect().top : sr.bottom; return { top, bottom: Math.max(0, sr.bottom - sy) + 6 }; }
    const sm = sumRef.current; return { top, bottom: sm ? sr.bottom - sm.getBoundingClientRect().top + 8 : 0 };
  }, [phone]);

  /* inputs */
  const pickKind = (k: HomeKind) => { setRaw((p) => (p.kind === k ? p : switchKind(c, p, k))); };
  const stepBeds = (d: number) => set((p) => { const beds = p.beds + d; return { ...p, beds, sqft: autoSize(c, p.kind, beds, p.maid) }; });
  const toggleMaid = () => set((p) => ({ ...p, maid: !p.maid, sqft: autoSize(c, p.kind, p.beds, !p.maid) }));
  const commitSize = (raw: string) => { const v = parseInt(raw.replace(/[^0-9]/g, ""), 10); if (Number.isFinite(v)) { const sq = unit === "m" ? v / SQM : v; set((p) => ({ ...p, sqft: Math.round(sq / 50) * 50 })); } setSizeText(null); };
  const p = ((s.sqft - K.size[0]) / (K.size[1] - K.size[0])) * 100;
  const typeKeys = Object.keys(c.types) as CleanType[];
  const extras = extrasFor(c, s.kind);
  const pct = Math.round(c.weeklyDiscount * 100);
  const rows: [string, string][] = [[t.labour(q.cleaners, q.hours, money(q.rate)), money(q.labour)]];
  if (q.materials) rows.push([t.matLine, money(q.materials)]);
  if (s.maid) rows.push([t.lines2.maid, money(q.maid)]);
  q.extras.forEach(([k, v]) => rows.push([exName(k), money(v)]));
  if (q.minimum) rows.push([t.lines.minimum, money(c.minimum)]);
  if (s.weekly) rows.push([t.lines.weekly(pct), t.lines.off(money(q.disc))]);
  const openBook = (e: React.MouseEvent) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setBooking({ x: r.left + r.width / 2 - innerWidth / 2, y: r.top + r.height / 2 - innerHeight / 2 }); };

  const summary = (
    <div className="summary" id="summary" ref={sumRef}>
      <div className="sum-main">
        <div>
          <span className="sum-label">{t.total}</span>
          <div className="price-line"><span className="price" data-price>{range(price, q.high)}</span><span className="per">{s.weekly ? t.perVisit : ""}</span></div>
        </div>
        <button type="button" className="btn primary book-btn" data-book onClick={openBook}><WaIcon /><span>{t.book}</span></button>
      </div>
      <div className="sum-short"><span className="crew"><b>{t.crew(q.cleaners, q.hours)}</b></span><span>{t.approx}</span></div>
      <button type="button" className="link-btn" aria-expanded={detailsOpen} aria-controls="detailsPanel" onClick={() => setDetailsOpen((v) => !v)}><span>{detailsOpen ? t.hide : t.details}</span><Chev s={12} /></button>
      <Reveal open={detailsOpen} id="detailsPanel"><div>
        <ul className="lines">{rows.map(([a, b]) => <li key={a}><span>{a}</span><span>{b}</span></li>)}<li className="total"><span>{t.lines.total + (s.weekly ? `${sep}${t.perVisit}` : "")}</span><span>{money(q.total)}</span></li></ul>
        <p className="note">{t.note}</p>
      </div></Reveal>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <header className="top rise" style={{ ["--d" as string]: 0 }} ref={topRef}>
          <div className="brand">{brand ? <span className="brand-name">{brand}</span> : null}</div>
          <LangSwitch className="lang-bar" lang={lang} setLang={setLang} />
        </header>

        <main className="cols">
          <aside className="sheet" id="sheet" ref={sheetRef}>
            <button className={`handle${dragging ? " drag" : ""}`} type="button" aria-label={t.handle} onPointerDown={hDown} onPointerMove={hMove} onPointerUp={hUp} onPointerCancel={hUp} onKeyDown={hKey}><span /></button>
            <div className="sheet-scroll" id="sheetScroll" ref={scrollRef}>
              <section className="intro">
                <h1 className="rise" style={{ ["--d" as string]: 1 }}>{t.title}</h1>
                <p className="lead rise" style={{ ["--d" as string]: 2 }}>{t.lead}</p>
              </section>

              <div className="card rise" style={{ ["--d" as string]: 3 }}>
                <div className="field">
                  <div className="field-head"><span className="label" id="kindLbl">{t.kind}</span></div>
                  <LayoutGroup id="kinds">
                    <div className="kinds" role="radiogroup" aria-labelledby="kindLbl">
                      {KINDS.filter((k) => c.kinds[k]).map((k) => (
                        <button key={k} type="button" role="radio" className="kind" data-kind={k} aria-checked={s.kind === k} onClick={() => pickKind(k)}>
                          {s.kind === k && <motion.span layoutId="kind-bg" className="kind-bg" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                          <span className="kind-lbl">{t.kinds[k]}</span>
                        </button>
                      ))}
                    </div>
                  </LayoutGroup>
                </div>

                <div className="field">
                  <div className="field-head">
                    <label htmlFor="sqftRange">{t.size}</label>
                    <span className="unit" role="group" aria-label={t.unitAria}>
                      {(["ft", "m"] as const).map((u) => <button key={u} type="button" aria-pressed={unit === u} onClick={() => { setUnit(u); store.set("unit", u); }}>{u === "ft" ? t.sqft : t.sqm}</button>)}
                    </span>
                  </div>
                  <div className="size-row">
                    <input type="range" id="sqftRange" min={K.size[0]} max={K.size[1]} step={50} value={s.sqft} style={{ ["--p" as string]: `${p}%` }} aria-valuetext={sizeStr(s.sqft)} onChange={(e) => set((x) => ({ ...x, sqft: +e.target.value }))} />
                    <div className="num-box"><input id="sqftNum" type="text" inputMode="numeric" autoComplete="off" aria-label={t.size} value={sizeText ?? fmt(toU(s.sqft))} onChange={(e) => setSizeText(e.target.value)} onBlur={(e) => commitSize(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} /><span>{uName}</span></div>
                  </div>
                  <p className="hint size-hint">{t.sizeRange(fmt(toU(K.size[0])), fmt(toU(K.size[1])), uName)}</p>
                </div>

                <div className="field">
                  <div className="field-head"><span className="label" id="floorsLbl">{t.floors}</span></div>
                  <Seg id="floorsSeg" label={t.floors} dir={t.dir} value={s.floors} onPick={(v) => set((x) => ({ ...x, floors: v }))} options={[1, 2, 3].map((n) => ({ v: n, node: n, disabled: n < K.floors[0] || n > K.floors[1] }))} />
                </div>

                <div className="field two">
                  <div>
                    <div className="field-head"><span className="label" id="bedsLbl">{t.bedrooms}</span></div>
                    <Stepper id="bedsLbl" label={t.bedrooms} value={s.beds} show={bedsShow(s.beds)} min={K.beds[0]} max={K.beds[1]} onStep={stepBeds} fewer={t.fewer} more={t.more} />
                  </div>
                  <div>
                    <div className="field-head"><span className="label" id="bathsLbl">{t.bathrooms}</span></div>
                    <Stepper id="bathsLbl" label={t.bathrooms} value={s.baths} show={String(s.baths)} min={K.baths[0]} max={K.baths[1]} onStep={(d) => set((x) => ({ ...x, baths: x.baths + d }))} fewer={t.fewer} more={t.more} />
                  </div>
                </div>

                <Reveal open={maidAllowed(s.kind)}><div className="field maid-field">
                  <button type="button" className="extra maid" aria-pressed={s.maid} tabIndex={maidAllowed(s.kind) ? 0 : -1} onClick={toggleMaid}><Tick /><span className="name">{t.maid}<small>{t.maidHint}</small></span><span className="amt">{money(c.maidRoom)}</span></button>
                </div></Reveal>

                <div className="field">
                  <div className="field-head"><span className="label" id="typeLbl">{t.type}</span></div>
                  <div className="types" role="radiogroup" aria-labelledby="typeLbl">
                    {typeKeys.map((k) => (
                      <button key={k} type="button" className="type" role="radio" data-v={k} aria-checked={s.type === k} tabIndex={s.type === k ? 0 : -1} onClick={() => set((x) => ({ ...x, type: k }))}>
                        <span className="radio" aria-hidden="true" />
                        <span className="type-body"><span className="type-top"><span className="type-name">{t.types[k][0]}</span><span className="type-rate">{(() => { const qq = quote(c, fitKind(c, { ...s, type: k })); return t.crew(qq.cleaners, qq.hours); })()}</span></span>
                          <Reveal open={s.type === k}><p className="type-desc">{t.types[k][1]}</p></Reveal></span>
                      </button>
                    ))}
                  </div>
                  <Reveal open={s.type === "move"}><div className="sub-field">
                    <div className="field-head"><span className="label" id="furnLbl">{t.furnishedQ}</span></div>
                    <Seg id="furnSeg" label={t.furnishedQ} dir={t.dir} value={s.furnished ? "f" : "u"} onPick={(v) => set((x) => ({ ...x, furnished: v === "f" }))} options={[{ v: "u", node: t.unfurnished }, { v: "f", node: t.furnished }]} />
                  </div></Reveal>
                </div>

                <div className="field">
                  <div className="field-head"><span className="label" id="matLbl">{t.materials}</span></div>
                  <Seg id="matSeg" label={t.materials} dir={t.dir} value={s.materials ? "bring" : "own"} onPick={(v) => set((x) => ({ ...x, materials: v === "bring" }))} options={[{ v: "bring", node: t.matBring }, { v: "own", node: t.matOwn }]} />
                  <p className="hint freq-note">{t.matNote(money(c.labour.materialsPerHour))}</p>
                </div>

                <div className="field">
                  <button type="button" className="row-toggle" aria-expanded={extrasOpen} aria-controls="extrasPanel" onClick={() => setExtrasOpen((v) => !v)}>
                    <span className="label">{t.extras}</span>
                    <span className="meta"><span>{s.extras.length ? t.extrasCount(s.extras.length) : t.extrasNone}</span><Chev /></span>
                  </button>
                  <Reveal open={extrasOpen} id="extrasPanel"><div className="extras">
                    {extras.map((k) => <button key={k} type="button" className="extra" data-k={k} aria-pressed={s.extras.includes(k)} onClick={() => set((x) => ({ ...x, extras: x.extras.includes(k) ? x.extras.filter((e) => e !== k) : [...x.extras, k] }))}><Tick /><span className="name">{exName(k)}</span><span className="amt">{money(c.extras[k].price)}</span></button>)}
                  </div></Reveal>
                </div>

                <div className="field">
                  <div className="field-head"><span className="label" id="freqLbl">{t.often}</span></div>
                  <Seg id="freqSeg" label={t.often} dir={t.dir} value={s.weekly ? "weekly" : "once"} onPick={(v) => set((x) => ({ ...x, weekly: v === "weekly" }))} options={[{ v: "once", node: t.once }, { v: "weekly", node: <>{t.weekly}<small>{t.save(pct)}</small></>, disabled: s.type === "move" }]} />
                  <Reveal open={s.type === "move"}><p className="hint freq-note">{t.weeklyOff}</p></Reveal>
                </div>
              </div>
              {phone && summary}
            </div>
          </aside>

          <section className="stagecol rise" style={{ ["--d" as string]: 2 }} aria-label="3D model of your home">
            <div className="stage" id="stage" ref={stageRef}>
              <div className="canvas-wrap" id="canvasWrap">
                <HouseCanvas sqft={s.sqft} floors={s.floors} bedrooms={s.beds} bathrooms={s.baths} kind={s.kind} maid={s.maid} pool={s.extras.includes("pool")} balcony={s.extras.includes("balcony")} insets={insets} />
              </div>
              <div className="stage-head" id="stageHead" ref={headRef}>
                <div className="stage-copy">
                  <AnimatePresence mode="wait" initial={false}><motion.h2 key={homeTitle} id="homeTitle" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.26, ease: EASE }}>{homeTitle}</motion.h2></AnimatePresence>
                  <p id="homeSub">{sub}</p>
                </div>
                <LangSwitch className="lang-stage" lang={lang} setLang={setLang} />
              </div>
              <p className="stage-hint">{t.drag}</p>
              {!phone && summary}
            </div>
          </section>
        </main>
      </div>

      <div className={`bar${phone ? " in" : ""}`} id="bar" ref={barRef}>
        <div className="bar-price">
          <span className="sr">{s.weekly ? `${t.total}${sep}${t.perVisit}` : t.total}</span>
          <FitPrice text={range(price, q.high)} />
          <span className="bar-crew">{t.crew(q.cleaners, q.hours)}</span>
        </div>
        <button type="button" className="btn primary" data-book onClick={openBook}><WaIcon /><span>{t.bookShort}</span></button>
      </div>

      <AnimatePresence>{booking && <Booking key="bk" c={c} t={t} lang={lang} brand={brand} s={s} q={q} money={money} homeLine={homeLine} exName={exName} range={range} phone={phone} origin={booking} onClose={() => setBooking(null)} />}</AnimatePresence>
    </MotionConfig>
  );
}

/* ----------------------------- booking ----------------------------- */
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const LIMIT = { name: 60, area: 80, building: 80, unit: 20, notes: 300 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Booking({ c, t, lang, brand, s, homeLine, exName, range, phone, origin, onClose }: { c: Company; t: any; lang: Lang; brand: string; s: State; q: ReturnType<typeof quote>; money: (n: number) => string; homeLine: string; exName: (k: string) => string; range: (a: number, b: number) => string; phone: boolean; origin: { x: number; y: number }; onClose: () => void }) {
  const [f, setF] = useState({ name: "", area: "", building: "", unit: "", notes: "" });
  const [day, setDay] = useState<null | "today" | "tomorrow" | "pick">(null), [dateValue, setDateValue] = useState(""), [time, setTime] = useState<number | null>(null);
  const [bad, setBad] = useState<Record<string, boolean>>({}), [done, setDone] = useState(false), [addrOpen, setAddrOpen] = useState(false), [copied, setCopied] = useState(false);
  const [ref] = useState(() => refCode(c));
  const [now] = useState(() => new Date());
  const nameRef = useRef<HTMLInputElement>(null), areaRef = useRef<HTMLInputElement>(null), dlg = useRef<HTMLDivElement>(null);
  /* Android back closes the sheet: one history entry while open. */
  const viaBack = useRef(false);
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  const requestClose = useCallback(() => {
    if (!history.state?.bk) { viaBack.current = true; onCloseRef.current(); return; }
    history.back();
    setTimeout(() => { if (!viaBack.current) { viaBack.current = true; onCloseRef.current(); } }, 400);
  }, []);
  const closeRef = useRef(requestClose); closeRef.current = requestClose;
  useEffect(() => {
    viaBack.current = false;
    history.pushState({ ...(history.state || {}), bk: 1 }, "");
    const pop = () => { if (viaBack.current) return; viaBack.current = true; onCloseRef.current(); };
    addEventListener("popstate", pop);
    return () => { removeEventListener("popstate", pop); if (!viaBack.current && history.state?.bk) history.back(); };
  }, []);
  /* Swipe down to close on phone: from the handle or header, or anywhere once the sheet is scrolled to the top. */
  const H = typeof window === "undefined" ? 800 : window.innerHeight;
  const y = useMotionValue(phone ? H : 0);
  const scrimOpacity = useTransform(y, (v) => (phone ? Math.max(0, Math.min(1, 1 - v / ((dlg.current?.offsetHeight || H) * 1.1))) : 1));
  useEffect(() => {
    const el = dlg.current; if (!el || !phone) return;
    let st: null | { x0: number; y0: number; grab: boolean; top: boolean; active: boolean; off: number; t0: number; ly: number; lt: number; v: number } = null;
    const start = (e: TouchEvent) => {
      const tg = e.target as HTMLElement, p0 = e.touches[0];
      if (e.touches.length > 1 || tg.closest("input, textarea, select, [contenteditable]")) { st = null; return; }
      st = { x0: p0.clientX, y0: p0.clientY, grab: !!tg.closest(".dlg-handle, .dlg-head") && !tg.closest("button"), top: el.scrollTop <= 0, active: false, off: 0, t0: performance.now(), ly: p0.clientY, lt: performance.now(), v: 0 };
    };
    const move = (e: TouchEvent) => {
      if (!st) return; const p0 = e.touches[0], dy = p0.clientY - st.y0, dx = p0.clientX - st.x0;
      if (!st.active) {
        if (Math.abs(dx) > Math.abs(dy) + 2) { st = null; return; }
        if (dy > 6 && (st.grab || (st.top && el.scrollTop <= 0))) { st.active = true; st.off = 6; }
        else if (dy < -4) { st = null; return; } else return;
      }
      e.preventDefault();
      const now = performance.now(), dt = Math.max(1, now - st.lt); st.v = 0.7 * st.v + 0.3 * ((p0.clientY - st.ly) / dt); st.ly = p0.clientY; st.lt = now;
      y.set(Math.max(0, dy - st.off));
    };
    const end = () => {
      if (!st || !st.active) { st = null; return; }
      const h = el.offsetHeight, far = y.get() > h * 0.28, el2 = performance.now() - st.t0, fast = st.v > 0.55 || (el2 < 300 && y.get() > 40 && y.get() / Math.max(1, el2) > 0.3); st = null;
      if (far || fast) { animate(y, h, { duration: 0.2, ease: [0.4, 0, 1, 1] }).then(() => closeRef.current()); }
      else animate(y, 0, { type: "spring", stiffness: 520, damping: 42 });
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end); el.addEventListener("touchcancel", end);
    return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
  }, [phone, y]);
  useEffect(() => {
    setF((x) => ({ ...x, name: store.get("name") || "", area: store.get("area") || "", building: store.get("building") || "", unit: store.get("unit") || "" }));
    const prev = document.activeElement as HTMLElement | null;
    // No autofocus on a field (it shows a ring with no tap); focus the dialog itself for screen readers and Tab.
    const id = setTimeout(() => dlg.current?.focus({ preventScroll: true }), 320);
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
      if (e.key === "Tab" && dlg.current) { const fs = Array.from(dlg.current.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input, textarea")).filter((n) => n.offsetParent !== null); if (!fs.length) return; if (e.shiftKey && document.activeElement === fs[0]) { e.preventDefault(); fs[fs.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === fs[fs.length - 1]) { e.preventDefault(); fs[0].focus(); } }
    };
    document.addEventListener("keydown", k);
    return () => { clearTimeout(id); document.removeEventListener("keydown", k); prev?.focus?.({ preventScroll: true }); };
  }, [onClose, phone]);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const picked = dateValue ? (() => { const [y, m, d] = dateValue.split("-").map(Number); return new Date(y, m - 1, d); })() : null;
  const date = day === "today" ? today : day === "tomorrow" ? addDays(today, 1) : picked;
  const todaySlots = slots(c, today, now), tomorrowSlots = slots(c, addDays(today, 1), now);
  const daySlots = date ? slots(c, date, now) : slots(c, addDays(today, 1), now);
  const dateErr = day === "pick" && picked ? (picked < today ? t.past : isClosed(c, picked) ? t.closed(new Intl.DateTimeFormat(t.locale, { weekday: "long" }).format(picked)) : "") : "";
  const q = quote(c, s, date ? date.getDay() : undefined);
  const timeLabel = (h: number) => new Intl.DateTimeFormat(lang === "en" || lang === "hi" ? "en-US" : t.locale, lang === "ar" ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : { hour: "numeric", hour12: true, minute: h % 1 ? "2-digit" : undefined }).format(new Date(2026, 0, 1, Math.floor(h), (h % 1) * 60));
  const dayLabel = (d: Date) => new Intl.DateTimeFormat(t.locale, { weekday: "short", day: "numeric", month: "short" }).format(d);
  const sep = lang === "en" || lang === "hi" ? ", " : "، ";
  useEffect(() => { if (time != null && !daySlots.find((x) => x.h === time)?.ok) setTime(null); }, [day, dateValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const msg = t.msg({
    ref, name: f.name.trim(), area: f.area.trim(),
    address: [f.building.trim(), f.unit.trim()].filter(Boolean).join(sep),
    date: date ? `${day === "today" ? t.today + sep : day === "tomorrow" ? t.tomorrow + sep : ""}${dayLabel(date)}` : "",
    time: time != null ? timeLabel(time) : "",
    home: homeLine, type: t.typeLong[s.type], freq: s.weekly ? t.weekly : t.oneTime,
    crew: t.crew(q.cleaners, q.hours), materials: s.materials ? t.matBringMsg : t.matOwnMsg,
    furnished: s.type === "move" ? (s.furnished ? t.furnished : t.unfurnished) : "",
    extras: q.extras.length ? q.extras.map(([k]) => exName(k)).join(sep) : t.none,
    estimate: `${range(q.total, q.high)}${s.weekly ? ` ${t.perVisit}` : ""}`, notes: f.notes.trim(),
  });
  const href = phone ? waUrl(c, msg) : waWebUrl(c, msg);
  const validate = () => {
    const miss = { name: !f.name.trim(), area: !f.area.trim(), day: !date || !!dateErr, time: time == null };
    setBad(miss); return !Object.values(miss).some(Boolean) ? null : miss;
  };
  const send = (e: React.MouseEvent) => {
    const miss = validate();
    if (miss) { e.preventDefault(); if (miss.name) nameRef.current?.focus(); else if (miss.area) areaRef.current?.focus(); return; }
    (["name", "area", "building", "unit"] as const).forEach((k) => store.set(k, f[k].trim()));
    setTimeout(() => setDone(true), 140);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(msg); } catch { const ta = document.createElement("textarea"); ta.value = msg; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove(); } setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const field = (k: keyof typeof f, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, ref?: React.RefObject<HTMLInputElement | null>, err?: string) => (
    <label className="f"><span>{label}</span><input ref={ref} className="input" dir="auto" maxLength={LIMIT[k]} aria-invalid={bad[k] || undefined} value={f[k]} onChange={(e) => { setF((x) => ({ ...x, [k]: e.target.value })); setBad((b) => ({ ...b, [k]: false })); }} {...extra} />{err && <p className="err">{err}</p>}</label>
  );
    return (
    <div className="modal" id="modal">
      {phone
        ? <motion.div className="scrim" onClick={requestClose} style={{ opacity: scrimOpacity }} />
        : <motion.div className="scrim" onClick={requestClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }} />}
      <motion.div className="dialog" ref={dlg} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bkTitle" style={phone ? { y } : undefined}
        initial={phone ? { y: H } : { opacity: 0, scale: 0.35, x: origin.x, y: origin.y, borderRadius: 999 }}
        animate={phone ? { y: 0 } : { opacity: 1, scale: 1, x: 0, y: 0, borderRadius: 28 }}
        exit={phone ? { y: H, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } } : { opacity: 0, scale: 0.35, x: origin.x, y: origin.y, borderRadius: 999 }}
        transition={{ duration: phone ? 0.46 : 0.48, ease: EASE }}>
        <div className="dlg-inner" id="dlgInner">
          <div className="dlg-handle" />
          <AnimatePresence mode="wait" initial={false}>
            {!done ? (
              <motion.div key="form" id="viewForm" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: phone ? 0 : 0.16 } }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="dlg-head"><h3 id="bkTitle">{t.book}</h3><button type="button" className="icon-btn" aria-label={t.close} onClick={requestClose}><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></div>
                <p className="dlg-lead">{t.bkLead(brand)}</p>
                <div className="dlg-sum"><span>{`${t.typeLong[s.type]}${sep}${homeLine}`}<br /><b>{t.crew(q.cleaners, q.hours)}</b></span><strong>{range(q.total, q.high)}</strong></div>
                {field("name", t.name, { autoComplete: "name", enterKeyHint: "next", id: "fName", onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); areaRef.current?.focus(); } } }, nameRef, t.errName)}
                {field("area", t.area, { autoComplete: "address-level3", enterKeyHint: "done", id: "fArea", list: "areas", onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } } }, areaRef, t.errArea)}
                <datalist id="areas">{c.areas.map((a) => <option key={a} value={a} />)}</datalist>
                <div className="f">
                  <span id="dateLbl">{t.date}</span>
                  <div className="chips" role="group" aria-labelledby="dateLbl" data-bad={bad.day || undefined}>
                    {(["today", "tomorrow", "pick"] as const).map((d) => {
                      const off = d === "today" ? !todaySlots.some((x) => x.ok) : d === "tomorrow" ? !tomorrowSlots.some((x) => x.ok) : false;
                      return <button key={d} type="button" className="chip" data-day={d} disabled={off} aria-pressed={day === d} onClick={() => { setDay((v) => (v === d ? null : d)); setBad((b) => ({ ...b, day: false })); }}>{t[d]}</button>;
                    })}
                  </div>
                  <Reveal open={day === "pick"}><div className="chips days" id="fDays" role="group" aria-label={t.pick}>
                    {Array.from({ length: 14 }, (_, i) => addDays(today, i + 2)).map((d) => { const v = ymd(d), off = isClosed(c, d); return <button key={v} type="button" className="chip" data-date={v} tabIndex={day === "pick" ? 0 : -1} disabled={off} aria-pressed={dateValue === v} onClick={() => { setDateValue(v); setBad((b) => ({ ...b, day: false })); }}>{dayLabel(d)}</button>; })}
                  </div></Reveal>
                  {(dateErr || (bad.day && !date)) && <p className="err show">{dateErr || t.errDay}</p>}
                </div>
                <div className="f">
                  <span id="timeLbl">{t.start}</span>
                  <div className="chips times" role="group" aria-labelledby="timeLbl">
                    {daySlots.map((x) => <button key={x.h} type="button" className="chip" data-h={x.h} disabled={!x.ok || !!dateErr} aria-pressed={time === x.h} onClick={() => { setTime((v) => (v === x.h ? null : x.h)); setBad((b) => ({ ...b, time: false })); }}>{timeLabel(x.h)}</button>)}
                  </div>
                  {bad.time && <p className="err show">{t.errTime}</p>}
                </div>
                <button type="button" className="row-toggle addr-toggle" aria-expanded={addrOpen} onClick={() => setAddrOpen((v) => !v)}><span className="label">{t.addr}</span><span className="meta"><span>{t.optional}</span><Chev /></span></button>
                <Reveal open={addrOpen}><div className="addr">
                  <div className="two">{field("building", t.building, { autoComplete: "address-line1", id: "fBuilding", tabIndex: addrOpen ? 0 : -1 })}{field("unit", t.unit, { id: "fUnit", tabIndex: addrOpen ? 0 : -1 })}</div>
                  <label className="f"><span>{t.notes}</span><textarea className="input area-in" dir="auto" id="fNotes" rows={2} maxLength={LIMIT.notes} tabIndex={addrOpen ? 0 : -1} placeholder={t.notesPh} value={f.notes} onChange={(e) => setF((x) => ({ ...x, notes: e.target.value }))} /></label>
                </div></Reveal>
                <p className="note approx">{t.approx}</p>
                <div className="dlg-foot"><a className="btn primary wide" id="sendBtn" href={href} target="_blank" rel="noopener" onClick={send}><WaIcon /><span>{t.send}</span></a></div>
              </motion.div>
            ) : (
              <motion.div key="done" id="viewDone" className="done play" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: EASE }}>
                <div className="done-mark"><svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M7 14.5l4.6 4.5L21 9.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3>{t.opening}</h3>
                <p>{t.doneLead(brand)}</p>
                <p className="ref-line">{t.ref} <b dir="ltr">{ref}</b></p>
                <div className="stack">
                  <a className="btn ghost wide" href={waUrl(c, msg)} target="_blank" rel="noopener"><span>{t.again}</span></a>
                  {!phone && <a className="btn ghost wide" href={waWebUrl(c, msg)} target="_blank" rel="noopener"><span>{t.web}</span></a>}
                  <button type="button" className="btn ghost wide" id="copyBtn" onClick={copy}><span>{copied ? t.copied : t.copy}</span></button>
                  <button type="button" className="btn primary wide" onClick={requestClose}><span>{t.done}</span></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
