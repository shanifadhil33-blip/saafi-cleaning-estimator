"use client";
/* Estimator UI, ported from Claude's demo page: same markup, spacing and motion, in React.
   Kept from ours: phone split sheet with handle, EN/AR/UR with RTL, WhatsApp booking, no brand, /c/[slug] config.
   Added: home types (studio, apartment, townhouse, villa, penthouse), GCC bedroom wording, maid's room, sq ft or sq m, pool for villas. */
import dynamic from "next/dynamic";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { STR, MORE, arBaths, arFloors, type Lang } from "@/lib/strings";
import { KINDS, SQM, autoSize, extrasFor, fitKind, initial, maidAllowed, quote, switchKind, waUrl, type CleanType, type Company, type HomeKind, type State } from "@/lib/quote";

const HouseCanvas = dynamic(() => import("./House"), { ssr: false });
const EASE = [0.22, 1, 0.36, 1] as const;
const nf = new Intl.NumberFormat("en-US");
const fmt = (n: number) => nf.format(Math.round(n));
const LANGS: { id: Lang; label: string }[] = [{ id: "en", label: "English" }, { id: "ar", label: "العربية" }, { id: "ur", label: "اردو" }];
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
  const t = { ...STR[lang], ...MORE[lang] };
  const set = useCallback((f: (p: State) => State) => setRaw((p) => fitKind(c, f(p))), [c]);
  const K = c.kinds[s.kind];
  const brand = c.brand[lang] || c.brand.en || "";
  const q = useMemo(() => quote(c, s), [c, s]);
  const price = useCount(q.total);
  const money = (n: number) => t.money(fmt(n));

  useEffect(() => {
    const u = new URLSearchParams(location.search).get("lang"), st = store.get("lang");
    const l = (["en", "ar", "ur"] as Lang[]).find((x) => x === u) ?? (["en", "ar", "ur"] as Lang[]).find((x) => x === st);
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
  const bathStr = (n: number) => (lang === "ar" ? arBaths(n) : lang === "ur" ? `${n} باتھ روم` : `${n} bath`);
  const homeTitle = typeof t.kindHome[s.kind] === "function" ? t.kindHome[s.kind](s.floors) : t.kindHome[s.kind];
  const sep = lang === "en" ? ", " : "، ";
  const sub = [sizeStr(s.sqft), bedsShow(s.beds) + (s.maid ? ` + ${t.maid}` : ""), bathStr(s.baths), lang === "en" ? t.typeLong[s.type].toLowerCase() : t.typeLong[s.type]].join(sep);
  const homeLine = [t.kinds[s.kind], sizeStr(s.sqft), lang === "ar" ? arFloors(s.floors) : lang === "ur" ? `${s.floors} ${s.floors === 1 ? "منزل" : "منزلیں"}` : `${s.floors} ${s.floors === 1 ? "floor" : "floors"}`, bedsShow(s.beds), bathStr(s.baths), ...(s.maid ? [t.maid] : [])].join(sep);
  const exName = (k: string) => t.ex[k] ?? t.ex2[k] ?? k;

  /* sheet (phone) */
  const sheetRef = useRef<HTMLElement>(null), scrollRef = useRef<HTMLDivElement>(null), barRef = useRef<HTMLDivElement>(null), topRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null), stageRef = useRef<HTMLDivElement>(null), sumRef = useRef<HTMLDivElement>(null);
  const sheet = useRef({ y: 0, snap: "half" as "full" | "half" | "peek", drag: null as null | { id: number; y0: number; s0: number; moved: boolean; last: number; t: number; v: number } });
  const [dragging, setDragging] = useState(false);
  const reduce = useReducedMotion();
  const snaps = useCallback(() => {
    const vh = window.innerHeight, bar = barRef.current?.offsetHeight || 76, top = (topRef.current?.offsetHeight || 50) + 8;
    const full = Math.max(top, Math.round(vh * 0.09)), half = Math.round(vh * 0.5), peek = Math.max(half + 60, Math.round(vh - bar - 150));
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
  const rateStr = (r: number) => t.money(r.toFixed(2));
  const rows: [string, string][] = [[t.lines.area(fmt(s.sqft), rateStr(q.rate)), money(q.area)]];
  if (s.beds) rows.push([t.lines.beds(s.beds), money(q.beds)]);
  rows.push([t.lines.baths(s.baths), money(q.baths)]);
  if (s.floors > 1) rows.push([t.lines.floorsX(s.floors - 1), money(q.floorsX)]);
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
          <div className="price-line"><span className="price" data-price>{money(price)}</span><span className="per">{s.weekly ? t.perVisit : ""}</span></div>
        </div>
        <button type="button" className="btn primary book-btn" data-book onClick={openBook}><WaIcon /><span>{t.book}</span></button>
      </div>
      <div className="sum-short">
        {([[t.short.area, q.area], [t.short.rooms, q.beds + q.baths + q.floorsX + q.maid], [t.short.extras, q.extrasSum]] as [string, number][]).map(([l, v]) => <span key={l}>{l} <b>{money(v)}</b></span>)}
      </div>
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
          <div className="lang" role="group" aria-label="Language">
            {LANGS.map((x) => <button key={x.id} type="button" lang={x.id} data-lang={x.id} aria-pressed={lang === x.id} onClick={() => setLang(x.id)}>{x.label}</button>)}
          </div>
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
                        <span className="type-body"><span className="type-top"><span className="type-name">{t.types[k][0]}</span><span className="type-rate">{t.perSqft((c.types[k].rate * K.rate).toFixed(2))}</span></span>
                          <Reveal open={s.type === k}><p className="type-desc">{t.types[k][1]}</p></Reveal></span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <button type="button" className="row-toggle" aria-expanded={extrasOpen} aria-controls="extrasPanel" onClick={() => setExtrasOpen((v) => !v)}>
                    <span className="label">{t.extras}</span>
                    <span className="meta"><span>{s.extras.length ? t.extrasCount(s.extras.length) : t.extrasNone}</span><Chev /></span>
                  </button>
                  <Reveal open={extrasOpen} id="extrasPanel"><div className="extras">
                    {extras.map((k) => <button key={k} type="button" className="extra" data-k={k} aria-pressed={s.extras.includes(k)} onClick={() => set((x) => ({ ...x, extras: x.extras.includes(k) ? x.extras.filter((e) => e !== k) : [...x.extras, k] }))}><Tick /><span className="name">{exName(k)}</span><span className="amt">{money(c.extras[k])}</span></button>)}
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
                <AnimatePresence mode="wait" initial={false}><motion.h2 key={homeTitle} id="homeTitle" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.26, ease: EASE }}>{homeTitle}</motion.h2></AnimatePresence>
                <p id="homeSub">{sub}</p>
              </div>
              <p className="stage-hint">{t.drag}</p>
              {!phone && summary}
            </div>
          </section>
        </main>
      </div>

      <div className={`bar${phone ? " in" : ""}`} id="bar" ref={barRef}>
        <div className="bar-price"><small>{s.weekly ? `${t.total}${sep}${t.perVisit}` : t.total}</small><span className="price" data-price>{money(price)}</span></div>
        <button type="button" className="btn primary" data-book onClick={openBook}><WaIcon /><span>{t.book}</span></button>
      </div>

      <AnimatePresence>{booking && <Booking key="bk" c={c} t={t} lang={lang} brand={brand} s={s} q={q} money={money} homeLine={homeLine} exName={exName} phone={phone} origin={booking} onClose={() => setBooking(null)} />}</AnimatePresence>
    </MotionConfig>
  );
}

/* ----------------------------- booking ----------------------------- */
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function nextWeekend(from: Date): [Date, Date | null] { const d = new Date(from), day = d.getDay(); if (day === 6 || day === 0) return [d, day === 6 ? addDays(d, 1) : null]; const sat = addDays(d, 6 - day); return [sat, addDays(sat, 1)]; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Booking({ c, t, lang, brand, s, q, money, homeLine, exName, phone, origin, onClose }: { c: Company; t: any; lang: Lang; brand: string; s: State; q: ReturnType<typeof quote>; money: (n: number) => string; homeLine: string; exName: (k: string) => string; phone: boolean; origin: { x: number; y: number }; onClose: () => void }) {
  const [name, setName] = useState(""), [area, setArea] = useState(""), [date, setDate] = useState<null | "tomorrow" | "weekend" | "pick">(null), [dateValue, setDateValue] = useState("");
  const [bad, setBad] = useState<{ name?: boolean; area?: boolean }>({}), [done, setDone] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null), areaRef = useRef<HTMLInputElement>(null), dlg = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setName(store.get("name") || ""); setArea(store.get("area") || "");
    const prev = document.activeElement as HTMLElement | null;
    const id = setTimeout(() => { if (!phone) (store.get("name") ? areaRef.current : nameRef.current)?.focus({ preventScroll: true }); else dlg.current?.focus({ preventScroll: true }); }, 320);
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "Tab" && dlg.current) { const f = Array.from(dlg.current.querySelectorAll<HTMLElement>("button, a[href], input")).filter((n) => n.offsetParent !== null); if (!f.length) return; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } }
    };
    document.addEventListener("keydown", k);
    return () => { clearTimeout(id); document.removeEventListener("keydown", k); prev?.focus?.({ preventScroll: true }); };
  }, [onClose, phone]);
  const dayLabel = (d: Date) => new Intl.DateTimeFormat(t.locale, { weekday: "short", day: "numeric", month: "short" }).format(d);
  const sep = lang === "en" ? ", " : "، ";
  const dateText = () => {
    const today = new Date();
    if (date === "tomorrow") return `${t.tomorrow}${sep}${dayLabel(addDays(today, 1))}`;
    if (date === "weekend") { const [a, b] = nextWeekend(today); return `${t.weekend}${sep}${dayLabel(a)}${b ? ` ${t.or} ${dayLabel(b)}` : ""}`; }
    if (date === "pick" && dateValue) { const [y, m, d] = dateValue.split("-").map(Number); return dayLabel(new Date(y, m - 1, d)); }
    return t.flexible;
  };
  const href = waUrl(c, t.msg({ brand, name: name.trim(), area: area.trim(), date: dateText(), home: homeLine, type: t.typeLong[s.type], freq: s.weekly ? t.weekly : t.oneTime, extras: q.extras.length ? q.extras.map(([k]) => exName(k)).join(sep) : t.none, total: money(q.total), weekly: s.weekly }));
  const send = (e: React.MouseEvent) => {
    const miss = { name: !name.trim(), area: !area.trim() };
    if (miss.name || miss.area) { e.preventDefault(); setBad(miss); (miss.name ? nameRef : areaRef).current?.focus(); return; }
    store.set("name", name.trim()); store.set("area", area.trim());
    setTimeout(() => setDone(true), 140);
  };
  const minDate = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  return (
    <div className="modal" id="modal">
      <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }} />
      <motion.div className="dialog" ref={dlg} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bkTitle"
        initial={phone ? { y: "100%" } : { opacity: 0, scale: 0.35, x: origin.x, y: origin.y, borderRadius: 999 }}
        animate={phone ? { y: 0 } : { opacity: 1, scale: 1, x: 0, y: 0, borderRadius: 28 }}
        exit={phone ? { y: "100%" } : { opacity: 0, scale: 0.35, x: origin.x, y: origin.y, borderRadius: 999 }}
        transition={{ duration: phone ? 0.46 : 0.48, ease: EASE }}>
        <div className="dlg-inner" id="dlgInner">
          <div className="dlg-handle" />
          <AnimatePresence mode="wait" initial={false}>
            {!done ? (
              <motion.div key="form" id="viewForm" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: phone ? 0 : 0.16 } }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="dlg-head"><h3 id="bkTitle">{t.book}</h3><button type="button" className="icon-btn" aria-label={t.close} onClick={onClose}><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></div>
                <p className="dlg-lead">{t.bkLead(brand)}</p>
                <div className="dlg-sum"><span>{`${t.typeLong[s.type]}${sep}${homeLine}`}</span><strong>{money(q.total)}</strong></div>
                <label className="f"><span>{t.name}</span><input ref={nameRef} className="input" id="fName" autoComplete="name" enterKeyHint="next" aria-invalid={bad.name || undefined} value={name} onChange={(e) => { setName(e.target.value); setBad((b) => ({ ...b, name: false })); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); areaRef.current?.focus(); } }} /><p className="err">{t.errName}</p></label>
                <label className="f"><span>{t.area}</span><input ref={areaRef} className="input" id="fArea" list="areas" autoComplete="address-level3" enterKeyHint="done" aria-invalid={bad.area || undefined} value={area} onChange={(e) => { setArea(e.target.value); setBad((b) => ({ ...b, area: false })); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }} /><p className="err">{t.errArea}</p></label>
                <datalist id="areas">{c.areas.map((a) => <option key={a} value={a} />)}</datalist>
                <div className="f">
                  <span id="dateLbl">{t.date}</span>
                  <div className="chips" role="group" aria-labelledby="dateLbl">
                    {(["tomorrow", "weekend", "pick"] as const).map((d) => <button key={d} type="button" className="chip" aria-pressed={date === d} onClick={() => setDate((v) => (v === d ? null : d))}>{t[d]}</button>)}
                  </div>
                  <Reveal open={date === "pick"}><input className="input date-in" id="fDate" type="date" min={minDate} aria-label={t.pick} value={dateValue} onChange={(e) => setDateValue(e.target.value)} /></Reveal>
                </div>
                <div className="dlg-foot"><a className="btn primary wide" id="sendBtn" href={href} target="_blank" rel="noopener" onClick={send}><span>{t.send}</span></a></div>
              </motion.div>
            ) : (
              <motion.div key="done" id="viewDone" className="done play" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: EASE }}>
                <div className="done-mark"><svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M7 14.5l4.6 4.5L21 9.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3>{t.opening}</h3>
                <p>{t.doneLead(brand)}</p>
                <div className="stack">
                  <a className="btn ghost wide" href={href} target="_blank" rel="noopener"><span>{t.again}</span></a>
                  <button type="button" className="btn primary wide" onClick={onClose}><span>{t.done}</span></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
