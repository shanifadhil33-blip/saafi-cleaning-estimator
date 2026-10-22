"use client";
/* Same house, drag sheet, language header, and compact booking bar as the GCC home page. Market config swaps homes, size, price, language, and contact. */
import dynamic from "next/dynamic";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getCopy } from "@/lib/marketCopy";
import { shownHomes } from "@/lib/markets";
import {
  bookingRef, checkArea, formatArea, formatMoney, houseVisual, initialState, isQuebecPostal, quote, snapHours, suggestedHours,
  type Freq, type Lang, type Market, type MState,
} from "@/lib/marketQuote";

const HouseCanvas = dynamic(() => import("./House"), { ssr: false });
const EASE = [0.22, 1, 0.36, 1] as const;
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
const store = {
  get: (k: string) => { try { return localStorage.getItem("mkt." + k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem("mkt." + k, v); } catch { /* off */ } },
};
const isLang = (x: string | null): x is Lang => x === "en" || x === "es" || x === "fr";
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const bedsForHours = (h: number) => (h <= 2 ? 1 : h <= 3 ? 2 : h <= 4 ? 3 : h <= 5 ? 4 : 5);

function usePhone() {
  const [p, setP] = useState(false);
  useIso(() => { const m = matchMedia("(max-width: 820px)"); const on = () => setP(m.matches); on(); m.addEventListener("change", on); return () => m.removeEventListener("change", on); }, []);
  return p;
}
function Tick() {
  return <span className="tick" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
}
function Chev({ s = 14 }: { s?: number }) {
  return <svg className="chev" width={s} height={s} viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5.2l4 3.8 4-3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Reveal({ open, children, id }: { open: boolean; children: React.ReactNode; id?: string }) {
  return <div className={`reveal${open ? " open" : ""}`} id={id}><div>{children}</div></div>;
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
    <div className="stepper" role="group" aria-labelledby={id}>
      <button type="button" className="step-btn" aria-label={`${fewer} ${label}`} disabled={value <= min} onClick={() => onStep(-1)}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>
      <Roll v={show} dir={dir} />
      <button type="button" className="step-btn" aria-label={`${more} ${label}`} disabled={value >= max} onClick={() => onStep(1)}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>
    </div>
  );
}
function LangSwitch({ lang, langs, setLang, className, label }: { lang: Lang; langs: Lang[]; setLang: (l: Lang) => void; className: string; label: string }) {
  return (
    <div className={`lang ${className}`} role="group" aria-label={label}>
      {langs.map((id) => <button key={id} type="button" lang={id} data-lang={id} aria-pressed={lang === id} onClick={() => setLang(id)}>{id.toUpperCase()}</button>)}
    </div>
  );
}
function nearest(list: number[], want: number) {
  return list.reduce((a, n) => Math.abs(n - want) < Math.abs(a - want) ? n : a, list[0]);
}

export default function MarketExperience({ market }: { market: Market }) {
  const homes = shownHomes(market.id);
  const hoursUi = market.id === "uk";
  const [lang, setLangState] = useState<Lang>(market.defaultLang);
  const [langLock, setLangLock] = useState(false);
  const [s, setS] = useState<MState>(() => initialState(market));
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [area, setArea] = useState("");
  const phone = usePhone();
  const copy = getCopy(lang, market.region);
  const money = (cents: number) => formatMoney(cents, market.currency);
  const q = useMemo(() => quote(market, s), [market, s]);
  const visual = houseVisual(s.home, s.beds, s.baths);
  const svc = market.services[s.service];
  const allow = (x: string | null): x is Lang => isLang(x) && market.langs.includes(x);

  useEffect(() => {
    const qLang = new URLSearchParams(location.search).get("lang");
    const stored = store.get("lang");
    if (allow(qLang)) { setLangState(qLang); setLangLock(true); }
    else if (allow(stored)) { setLangState(stored); setLangLock(true); }
  }, [market]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (langLock || market.areaKind !== "ca") return;
    if (isQuebecPostal(area)) setLangState("fr");
  }, [area, langLock, market.areaKind]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";
    document.title = copy.title;
  }, [lang, copy.title]);
  const setLang = (l: Lang) => { setLangState(l); setLangLock(true); store.set("lang", l); };

  const stepList = (list: number[], cur: number, d: number) => {
    const i = Math.max(0, list.indexOf(cur));
    return list[Math.min(list.length - 1, Math.max(0, i + d))];
  };
  const setBeds = (d: number) => setS((p) => {
    const beds = stepList(market.beds, p.beds, d);
    const hours = p.hoursTouched ? p.hours : snapHours(suggestedHours(beds, p.rooms, market.rooms), market.hourChoices);
    return { ...p, beds, hours };
  });
  const setBaths = (d: number) => setS((p) => ({ ...p, baths: stepList(market.baths, p.baths, d) }));
  const setHours = (d: number) => setS((p) => {
    const hours = stepList(market.hourChoices, p.hours, d);
    const beds = bedsForHours(hours);
    const baths = nearest(market.baths, beds <= 1 ? 1 : beds <= 3 ? 2 : 3);
    return { ...p, hours, hoursTouched: true, beds, baths };
  });
  const pickHome = (id: string) => setS((p) => ({ ...p, home: id }));
  const pickService = (id: string) => setS((p) => ({ ...p, service: id, freq: market.services[id].discount ? p.freq : "once" }));
  const toggleExtra = (id: string) => setS((p) => {
    const extras = { ...p.extras };
    if (extras[id]) delete extras[id]; else extras[id] = 1;
    return { ...p, extras };
  });

  const sheetRef = useRef<HTMLElement>(null), scrollRef = useRef<HTMLDivElement>(null), barRef = useRef<HTMLDivElement>(null), topRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null), stageRef = useRef<HTMLDivElement>(null), sumRef = useRef<HTMLDivElement>(null);
  const sheet = useRef({ y: 0, snap: "half" as "full" | "half" | "peek", drag: null as null | { id: number; y0: number; s0: number; moved: boolean; last: number; t: number; v: number } });
  const [dragging, setDragging] = useState(false);
  const reduce = useReducedMotion();
  const snaps = useCallback(() => {
    const vh = window.innerHeight, bar = barRef.current?.offsetHeight || 76, top = (topRef.current?.offsetHeight || 0) + 8;
    const full = Math.max(top, Math.round(vh * 0.09));
    const half = Math.round(vh * 0.5) - 80, peek = Math.max(half + 60, Math.round(vh - bar - 150));
    return { full, half, peek };
  }, []);
  const apply = useCallback((y: number, smooth: boolean) => {
    const el = sheetRef.current; if (!el) return; sheet.current.y = y;
    el.style.transition = smooth && !reduce ? "transform 460ms cubic-bezier(.22,1,.36,1)" : "none";
    el.style.transform = `translate3d(0, ${y}px, 0)`;
  }, [reduce]);
  const pad = useCallback(() => { const sn = snaps(), el = sheetRef.current, sc = scrollRef.current; if (!el || !sc) return; el.style.setProperty("--sheet-full", sn.full + "px"); sc.style.paddingBottom = Math.max(0, sheet.current.y - sn.full) + (barRef.current?.offsetHeight || 76) + 28 + "px"; }, [snaps]);
  const go = useCallback((name: "full" | "half" | "peek", smooth = true) => { sheet.current.snap = name; apply(snaps()[name], smooth); pad(); if (name === "peek" && scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: "smooth" }); }, [apply, snaps, pad]);
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
  const insets = useCallback(() => {
    const st = stageRef.current, h = headRef.current; if (!st) return { top: 0, bottom: 0 };
    const sr = st.getBoundingClientRect(), top = h ? h.getBoundingClientRect().bottom - sr.top + 10 : 0;
    if (phone) { const sy = sheetRef.current ? sheetRef.current.getBoundingClientRect().top : sr.bottom; return { top, bottom: Math.max(0, sr.bottom - sy) + 6 }; }
    const sm = sumRef.current; return { top, bottom: sm ? sr.bottom - sm.getBoundingClientRect().top + 8 : 0 };
  }, [phone]);

  const homeTitle = copy.homes[s.home] ?? s.home;
  const sub = hoursUi
    ? `${copy.hours} ${s.hours}, ${copy.services[s.service]?.name ?? s.service}`
    : `${s.beds === 0 ? copy.studio : s.beds} ${copy.beds.toLowerCase()}, ${s.baths} ${copy.baths.toLowerCase()}`;
  const handle = lang === "fr" ? "Redimensionner" : lang === "es" ? "Cambiar el panel" : "Resize panel";
  const drag = lang === "fr" ? "Glissez pour regarder" : lang === "es" ? "Arrastra para mirar" : "Drag to look around";
  const bookShort = lang === "fr" ? "Envoyer" : lang === "es" ? "Pedir" : "Request";
  const recurring = !!svc?.discount;
  const rows: [string, string][] = [[copy.cleaning, money(q.cleaningCents)]];
  if (q.discountCents) rows.push([copy.freqs[s.freq], copy.off(money(q.discountCents))]);
  if (q.weekendCents) rows.push([copy.weekendLine, money(q.weekendCents)]);
  if (q.productsCents) rows.push([copy.productsLine, money(q.productsCents)]);
  q.lines.forEach((l) => rows.push([copy.extraNames[l.id] ?? l.id, money(l.cents)]));

  const summary = (
    <div className="summary" id="summary" ref={sumRef}>
      <div className="sum-main">
        <div>
          <span className="sum-label">{copy.total}</span>
          <div className="price-line"><span className="price" data-price>{money(q.totalCents)}</span><span className="per">{recurring && s.freq !== "once" ? copy.perVisit : ""}</span></div>
        </div>
        <button type="button" className="btn primary book-btn" data-book onClick={() => setBooking(true)}><span>{bookShort}</span></button>
      </div>
      <div className="sum-short"><span>{recurring && s.freq !== "once" ? copy.perVisit : copy.oneTime}</span><span>{copy.confirmed}</span></div>
      <button type="button" className="link-btn" aria-expanded={detailsOpen} aria-controls="detailsPanel" onClick={() => setDetailsOpen((v) => !v)}><span>{detailsOpen ? (lang === "fr" ? "Masquer" : lang === "es" ? "Ocultar" : "Hide") : (lang === "fr" ? "Détails" : lang === "es" ? "Detalles" : "Details")}</span><Chev s={12} /></button>
      <Reveal open={detailsOpen} id="detailsPanel"><div>
        <ul className="lines">{rows.map(([a, b]) => <li key={a}><span>{a}</span><span>{b}</span></li>)}<li className="total"><span>{copy.total}</span><span>{money(q.totalCents)}</span></li></ul>
        {market.showTax ? <p className="note">{copy.tax}</p> : <p className="note">{copy.confirmed}</p>}
      </div></Reveal>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="app" data-market={market.id} data-lang={lang} data-total={q.totalCents}>
        <header className="top rise" style={{ ["--d" as string]: 0 }} ref={topRef}>
          <div className="brand" />
          <LangSwitch className="lang-bar" lang={lang} langs={market.langs} setLang={setLang} label={copy.language} />
        </header>
        <main className="cols">
          <aside className="sheet" id="sheet" ref={sheetRef}>
            <button className={`handle${dragging ? " drag" : ""}`} type="button" aria-label={handle} onPointerDown={hDown} onPointerMove={hMove} onPointerUp={hUp} onPointerCancel={hUp} onKeyDown={hKey}><span /></button>
            <div className="sheet-scroll" id="sheetScroll" ref={scrollRef}>
              <section className="intro">
                <h1 className="rise" style={{ ["--d" as string]: 1 }}>{copy.title}</h1>
                <p className="lead rise" style={{ ["--d" as string]: 2 }}>{copy.lead}</p>
              </section>
              <div className="card rise" style={{ ["--d" as string]: 3 }}>
                <div className="field">
                  <div className="field-head"><span className="label" id="kindLbl">{copy.home}</span></div>
                  <LayoutGroup id="kinds">
                    <div className="kinds" role="radiogroup" aria-labelledby="kindLbl">
                      {homes.map((id) => (
                        <button key={id} type="button" role="radio" className="kind" data-kind={id} aria-checked={s.home === id} onClick={() => pickHome(id)}>
                          {s.home === id && <motion.span layoutId="kind-bg" className="kind-bg" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                          <span className="kind-lbl">{copy.homes[id] ?? id}</span>
                        </button>
                      ))}
                    </div>
                  </LayoutGroup>
                </div>

                {hoursUi ? (
                  <div className="field">
                    <div className="field-head"><span className="label" id="hoursLbl">{copy.hours}</span></div>
                    <Stepper id="hoursLbl" label={copy.hours} value={s.hours} show={String(s.hours)} min={market.hourChoices[0]} max={market.hourChoices[market.hourChoices.length - 1]} onStep={setHours} fewer={copy.fewer} more={copy.more} />
                    <p className="hint">{copy.hoursHint(s.beds)}</p>
                  </div>
                ) : (
                  <div className="field two">
                    <div>
                      <div className="field-head"><span className="label" id="bedsLbl">{copy.beds}</span></div>
                      <Stepper id="bedsLbl" label={copy.beds} value={s.beds} show={s.beds === 0 ? copy.studio : String(s.beds)} min={market.beds[0]} max={market.beds[market.beds.length - 1]} onStep={setBeds} fewer={copy.fewer} more={copy.more} />
                    </div>
                    <div>
                      <div className="field-head"><span className="label" id="bathsLbl">{copy.baths}</span></div>
                      <Stepper id="bathsLbl" label={copy.baths} value={s.baths} show={String(s.baths)} min={market.baths[0]} max={market.baths[market.baths.length - 1]} onStep={setBaths} fewer={copy.fewer} more={copy.more} />
                    </div>
                  </div>
                )}

                <div className="field">
                  <div className="field-head"><span className="label" id="typeLbl">{copy.service}</span></div>
                  <div className="types" role="radiogroup" aria-labelledby="typeLbl">
                    {market.serviceOrder.map((id) => {
                      const preview = quote(market, { ...s, service: id, freq: market.services[id].discount ? s.freq : "once" });
                      const info = copy.services[id];
                      return (
                        <button key={id} type="button" className="type" role="radio" data-v={id} aria-checked={s.service === id} onClick={() => pickService(id)}>
                          <span className="radio" aria-hidden="true" />
                          <span className="type-body">
                            <span className="type-top"><span className="type-name">{info?.name ?? id}</span><span className="type-rate">{money(preview.totalCents)}</span></span>
                            <Reveal open={s.service === id}><p className="type-desc">{info?.items.join(". ")}</p></Reveal>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {market.productsPerHour > 0 && (
                  <div className="field">
                    <div className="field-head"><span className="label">{copy.supplies}</span></div>
                    <div className="chips">
                      <button type="button" className="chip" aria-pressed={s.products} onClick={() => setS((p) => ({ ...p, products: true }))}>{copy.supplyYes}</button>
                      <button type="button" className="chip" aria-pressed={!s.products} onClick={() => setS((p) => ({ ...p, products: false }))}>{copy.supplyNo}</button>
                    </div>
                  </div>
                )}

                <div className="field">
                  <button type="button" className="row-toggle" aria-expanded={extrasOpen} aria-controls="extrasPanel" onClick={() => setExtrasOpen((v) => !v)}>
                    <span className="label">{copy.extras}</span>
                    <span className="meta"><span>{Object.keys(s.extras).length ? String(Object.keys(s.extras).length) : copy.optional}</span><Chev /></span>
                  </button>
                  <Reveal open={extrasOpen} id="extrasPanel"><div className="extras">
                    {market.extraOrder.map((id) => (
                      <button key={id} type="button" className="extra" data-k={id} aria-pressed={!!s.extras[id]} onClick={() => toggleExtra(id)}><Tick /><span className="name">{copy.extraNames[id] ?? id}</span><span className="amt">{money(Math.round(market.extras[id].price * 100))}</span></button>
                    ))}
                  </div></Reveal>
                </div>

                {recurring ? (
                  <div className="field">
                    <div className="field-head"><span className="label" id="freqLbl">{copy.often}</span></div>
                    <div className="chips" role="radiogroup" aria-labelledby="freqLbl">
                      {(["once", "weekly", "biweekly", "monthly"] as Freq[]).map((id) => (
                        <button key={id} type="button" className="chip" data-freq={id} role="radio" aria-checked={s.freq === id} onClick={() => setS((p) => ({ ...p, freq: id }))}>
                          {copy.freqs[id]}{id !== "once" ? <small>{copy.save(Math.round(market.discounts[id] * 100))}</small> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : <p className="hint freq-note">{copy.freqOff}</p>}

                {market.weekendPerHour > 0 && svc?.mode === "hourly" && (
                  <div className="field">
                    <button type="button" className="chip" data-weekend="1" aria-pressed={s.weekend} onClick={() => setS((p) => ({ ...p, weekend: !p.weekend }))}>{copy.weekend}</button>
                  </div>
                )}
              </div>
              {phone && summary}
            </div>
          </aside>

          <section className="stagecol rise" style={{ ["--d" as string]: 2 }} aria-label="3D model of your home">
            <div className="stage" id="stage" ref={stageRef}>
              <div className="canvas-wrap" id="canvasWrap">
                <HouseCanvas sqft={visual.sqft} floors={visual.floors} bedrooms={visual.kind === "studio" ? 0 : Math.max(1, s.beds)} bathrooms={visual.bathrooms} kind={visual.kind} insets={insets} />
              </div>
              <div className="stage-head" id="stageHead" ref={headRef}>
                <div className="stage-copy">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.h2 key={homeTitle} id="homeTitle" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.26, ease: EASE }}>{homeTitle}</motion.h2>
                  </AnimatePresence>
                  <p id="homeSub">{sub}</p>
                </div>
                <LangSwitch className="lang-stage" lang={lang} langs={market.langs} setLang={setLang} label={copy.language} />
              </div>
              <p className="stage-hint">{drag}</p>
              {!phone && summary}
            </div>
          </section>
        </main>
      </div>

      <div className={`bar${phone ? " in" : ""}`} id="bar" ref={barRef}>
        <div className="bar-price">
          <span className="price" data-price>{money(q.totalCents)}</span>
          <span className="bar-crew">{recurring && s.freq !== "once" ? copy.perVisit : copy.oneTime}</span>
        </div>
        <button type="button" className="btn primary" data-book onClick={() => setBooking(true)}><span>{bookShort}</span></button>
      </div>

      <AnimatePresence>{booking && <MarketBooking key="bk" market={market} lang={lang} s={s} area={area} setArea={setArea} onClose={() => setBooking(false)} phone={phone} />}</AnimatePresence>
    </MotionConfig>
  );
}

function MarketBooking({ market, lang, s, area, setArea, onClose, phone }: {
  market: Market; lang: Lang; s: MState; area: string; setArea: (v: string) => void; onClose: () => void; phone: boolean;
}) {
  const copy = getCopy(lang, market.region);
  const money = (cents: number) => formatMoney(cents, market.currency);
  const q = quote(market, s);
  const [name, setName] = useState("");
  const [day, setDay] = useState<null | "today" | "tomorrow" | "pick">(null);
  const [dateValue, setDateValue] = useState("");
  const [time, setTime] = useState<number | null>(null);
  const [bad, setBad] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [now] = useState(() => new Date());
  const [ref] = useState(() => bookingRef());
  const dlg = useRef<HTMLDivElement>(null);
  const H = typeof window === "undefined" ? 800 : window.innerHeight;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const picked = dateValue ? (() => { const [y, m, d] = dateValue.split("-").map(Number); return new Date(y, m - 1, d); })() : null;
  const date = day === "today" ? today : day === "tomorrow" ? addDays(today, 1) : picked;
  const slotsFor = (d: Date) => {
    const same = d.toDateString() === now.toDateString();
    const lead = now.getHours() + now.getMinutes() / 60 + 2;
    const out: { h: number; ok: boolean }[] = [];
    for (let h = 8; h <= 18; h += 2) out.push({ h, ok: !same || h >= lead });
    return out;
  };
  const daySlots = date ? slotsFor(date) : slotsFor(addDays(today, 1));
  const labelDay = (d: Date) => `${copy.months[d.getMonth()]} ${d.getDate()}`;
  const labelTime = (h: number) => (lang === "en" ? `${h % 12 || 12}${h < 12 ? "am" : "pm"}` : `${h} h`);
  const areaSt = checkArea(market, area);

  useEffect(() => {
    const id = setTimeout(() => dlg.current?.focus({ preventScroll: true }), 280);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    document.addEventListener("keydown", k);
    return () => { clearTimeout(id); document.removeEventListener("keydown", k); };
  }, [onClose]);

  const msg = [
    copy.msgIntro, "",
    `${copy.fullName}: ${name.trim()}`,
    `${copy.area}: ${formatArea(market, area)}`,
    `${copy.service}: ${copy.services[s.service]?.name ?? s.service}`,
    `${copy.home}: ${copy.homes[s.home] ?? s.home}`,
    market.id === "uk" ? `${copy.hours}: ${q.hours}` : `${copy.beds}: ${s.beds}, ${copy.baths}: ${s.baths}`,
    `${copy.total}: ${money(q.totalCents)}`,
    date ? `${copy.when}: ${labelDay(date)}` : "",
    time != null ? labelTime(time) : "",
    `${copy.refLabel}: ${ref}`,
  ].filter(Boolean).join("\n");
  const links = [
    { id: "tel", href: `tel:${market.contact.phoneTel}`, label: copy.call },
    { id: "sms", href: `sms:${market.contact.phoneTel}?body=${encodeURIComponent(msg)}`, label: copy.text },
    { id: "mailto", href: `mailto:${market.contact.email}?subject=${encodeURIComponent(copy.msgIntro)}&body=${encodeURIComponent(msg)}`, label: copy.emailUs },
    ...(market.contact.whatsapp ? [{ id: "whatsapp", href: `https://wa.me/${market.contact.whatsapp}?text=${encodeURIComponent(msg)}`, label: copy.whatsapp }] : []),
  ];
  const send = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = copy.errName;
    if (areaSt !== "in") next.area = areaSt === "out" ? copy.areaOut : area.trim() ? copy.areaBad : copy.errArea;
    if (!date) next.day = copy.errDate;
    if (time == null) next.time = copy.errWindow;
    setBad(next);
    if (Object.keys(next).length) return;
    setDone(true);
  };

  return (
    <div className="modal" id="modal">
      <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div className="dialog" ref={dlg} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bkTitle"
        initial={phone ? { y: H } : { opacity: 0, y: 16 }}
        animate={phone ? { y: 0 } : { opacity: 1, y: 0 }}
        exit={phone ? { y: H } : { opacity: 0, y: 16 }}
        transition={{ duration: phone ? 0.46 : 0.35, ease: EASE }}>
        <div className="dlg-inner">
          <div className="dlg-handle" />
          <AnimatePresence mode="wait" initial={false}>
            {!done ? (
              <motion.div key="form" id="viewForm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="dlg-head"><h3 id="bkTitle">{copy.request}</h3><button type="button" className="icon-btn" aria-label={copy.edit} onClick={onClose}><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></div>
                <p className="dlg-lead">{copy.confirmed}</p>
                <div className="dlg-sum"><span>{`${copy.services[s.service]?.name ?? s.service}`}<br /><b>{copy.homes[s.home] ?? s.home}</b></span><strong>{money(q.totalCents)}</strong></div>
                <label className="f"><span>{copy.fullName}</span><input id="fName" className="input" autoComplete="name" value={name} aria-invalid={bad.name ? true : undefined} onChange={(e) => { setName(e.target.value); setBad((b) => ({ ...b, name: "" })); }} />{bad.name && <p className="err show">{bad.name}</p>}</label>
                <label className="f"><span>{copy.area}</span><input id="fArea" className="input" autoComplete="postal-code" inputMode={market.areaKind === "zip" ? "numeric" : "text"} placeholder={copy.areaPh} value={area} aria-invalid={bad.area ? true : undefined} onChange={(e) => { setArea(e.target.value); setBad((b) => ({ ...b, area: "" })); }} />{bad.area && <p className="err show">{bad.area}</p>}</label>
                <div className="f">
                  <span id="dateLbl">{copy.when}</span>
                  <div className="chips" role="group" aria-labelledby="dateLbl">
                    {(["today", "tomorrow"] as const).map((d) => (
                      <button key={d} type="button" className="chip" data-day={d} aria-pressed={day === d} onClick={() => { setDay(d); setBad((b) => ({ ...b, day: "" })); }}>{d === "today" ? copy.today : copy.tomorrow}</button>
                    ))}
                    <button type="button" className="chip" data-day="pick" aria-pressed={day === "pick"} onClick={() => setDay("pick")}>{lang === "fr" ? "Choisir une date" : lang === "es" ? "Elegir fecha" : "Pick a date"}</button>
                  </div>
                  <Reveal open={day === "pick"}><div className="chips days" id="fDays">
                    {Array.from({ length: 12 }, (_, i) => addDays(today, i + 2)).map((d) => {
                      const v = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
                      return <button key={v} type="button" className="chip" data-date={v} aria-pressed={dateValue === v} onClick={() => { setDateValue(v); setDay("pick"); setBad((b) => ({ ...b, day: "" })); }}>{labelDay(d)}</button>;
                    })}
                  </div></Reveal>
                  {bad.day && <p className="err show">{bad.day}</p>}
                </div>
                <div className="f">
                  <span id="timeLbl">{copy.windowsLabel}</span>
                  <div className="chips times" role="group" aria-labelledby="timeLbl">
                    {daySlots.map((x) => <button key={x.h} type="button" className="chip" data-h={x.h} disabled={!x.ok} aria-pressed={time === x.h} onClick={() => { setTime(x.h); setBad((b) => ({ ...b, time: "" })); }}>{labelTime(x.h)}</button>)}
                  </div>
                  {bad.time && <p className="err show">{bad.time}</p>}
                </div>
                <div className="dlg-foot"><button type="button" className="btn primary wide" id="sendBtn" onClick={send}><span>{copy.request}</span></button></div>
              </motion.div>
            ) : (
              <motion.div key="done" id="viewDone" className="done play" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: EASE }}>
                <div className="done-mark"><svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M7 14.5l4.6 4.5L21 9.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3>{copy.doneTitle}</h3>
                <p>{copy.doneBody}</p>
                <p className="ref-line">{money(q.totalCents)} · {market.contact.phoneDisplay}</p>
                <p className="ref-line">{market.contact.email}</p>
                <div className="stack">
                  {links.map((l) => <a key={l.id} className="btn primary wide" data-contact={l.id} href={l.href}><span>{l.label}</span></a>)}
                  <button type="button" className="btn ghost wide" onClick={onClose}><span>{copy.edit}</span></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
