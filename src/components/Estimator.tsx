"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { createContext, useContext } from "react";
import { LANGS, tr, phr, money, type Lang } from "@/lib/i18n";
const LangCtx = createContext<Lang>("en");
const useL = () => { const l = useContext(LangCtx); return { l, t: tr(l), P: phr(l) }; };

const SPRING = { type: "spring", stiffness: 380, damping: 38, mass: 0.9 } as const;
const EASE = { duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const;

function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return <AnimatePresence initial={false}>{open && <motion.div key="c" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={EASE} style={{ overflow: "hidden" }}>{children}</motion.div>}</AnimatePresence>;
}
import { estimate, fmt, homeLabel, whatsappUrl, type Company, type Home, type CleanType } from "@/lib/engine";
import { ROOM_COLORS, ROOM_NAMES } from "./rooms";
import type { Focus } from "./House";

const House = dynamic(() => import("./House"), { ssr: false, loading: () => <div className="model-loading">Building your home…</div> });

function useTicker(value: number) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now(), a = from.current, reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(value); from.current = value; return; }
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 350), e = 1 - Math.pow(1 - p, 3);
      const v = Math.round(a + (value - a) * e); setShown(v); from.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

function Stepper({ label, value, step, min, max, onChange }: { label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void }) {
  const { P } = useL();
  const prev = useRef(value); const dir = value >= prev.current ? 1 : -1; useEffect(() => { prev.current = value; }, [value]);
  return (
    <div>
      <span className="label">{label}</span>
      <div className="stepper" role="group" aria-label={label}>
        <button type="button" aria-label={P.fewer(label)} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <output aria-live="polite" className="num"><AnimatePresence mode="popLayout" initial={false}><motion.span key={value} initial={{ y: 14 * dir, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14 * dir, opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} style={{ display: "inline-block" }}>{value}</motion.span></AnimatePresence></output>
        <button type="button" aria-label={P.more(label)} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>+</button>
      </div>
    </div>
  );
}

const today = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

export default function Estimator({ company: c }: { company: Company }) {
  const [home, setHome] = useState<Home>({ sqft: 2800, floors: 3, bedrooms: 1, bathrooms: 1.5, type: "standard" });
  const [openFloors, setOpenFloors] = useState(true);
  const [roof, setRoof] = useState(true);
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => { const q = new URLSearchParams(location.search).get("lang") ?? localStorage.getItem("lang"); if (q === "ur" || q === "ar" || q === "en") setLang(q); }, []);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === "en" ? "ltr" : "rtl"; localStorage.setItem("lang", lang); }, [lang]);
  const t = tr(lang), P = phr(lang), M = (n: number) => money(lang, c.currency, fmt(n));
  const sub = [P.sqft(fmt(home.sqft)), P.bed(home.bedrooms), P.bath(home.bathrooms), ...(home.rooms ?? []).map((k) => t(c.rooms?.[k]?.label ?? k)), P.clean(t(c.types[home.type].label))].join(" · ");
  const lineLabel = (k: string, a: number) => {
    const tt = c.types[home.type];
    if (k === "area") return `${t("Square footage")} · ${P.sqft(fmt(home.sqft))} × ${M(tt.perSqft)}`;
    if (k === "bed") return `${t("Bedrooms")} · ${home.bedrooms} × ${M(c.perBedroom)}`;
    if (k === "bath") return `${t("Bathrooms")} · ${home.bathrooms} × ${M(c.perBathroom)}`;
    if (k === "floors") return `${t("Extra floors")} · ${home.floors - 1} × ${M(c.perExtraFloor)}`;
    if (k === "weekly") return P.weeklyLine(Math.round((c.weeklyDiscount ?? 0) * 100));
    const [g, id] = k.split("-"); const tbl = g === "rooms" ? c.rooms : c.extras; return t(tbl?.[id]?.label ?? k) + (a ? "" : "");
  };
  const [booking, setBooking] = useState<{ x: number; y: number } | null>(null);
  const [showX, setShowX] = useState(false), [showD, setShowD] = useState(false);
  const openBook = (e: React.MouseEvent) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setBooking({ x: r.left + r.width / 2 - innerWidth / 2, y: r.top + r.height / 2 - innerHeight / 2 }); };
  // Phone bottom sheet: peek, half, full. Positions are offsets from the full position.
  const [sheet, setSheet] = useState<"peek" | "half" | "full">("half");
  const [drag, setDrag] = useState<number | null>(null);
  const formRef = useRef<HTMLElement>(null);
  const [formEnd, setFormEnd] = useState(true);
  const checkEnd = () => { const e = formRef.current; if (e) setFormEnd(e.scrollHeight - e.scrollTop - e.clientHeight < 4); };
  useEffect(() => { checkEnd(); window.addEventListener("resize", checkEnd); return () => window.removeEventListener("resize", checkEnd); }, []);
  const sheetRef = useRef<HTMLDivElement>(null), bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (sheet === "peek") bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [sheet]);
  const g = useRef({ y0: 0, base: 0, t: 0, last: 0, v: 0 });
  const offsets = () => { const h = sheetRef.current?.offsetHeight ?? 600, vh = window.innerHeight; return { full: 0, half: Math.max(0, h - vh * 0.5), peek: Math.max(0, h - 150) }; };
  const onGrabDown = (e: React.PointerEvent) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); const o = offsets(); g.current = { y0: e.clientY, base: o[sheet], t: performance.now(), last: e.clientY, v: 0 }; setDrag(o[sheet]); };
  const onGrabMove = (e: React.PointerEvent) => { if (drag == null) return; const o = offsets(), now = performance.now(); g.current.v = (e.clientY - g.current.last) / Math.max(1, now - g.current.t); g.current.t = now; g.current.last = e.clientY; setDrag(Math.min(o.peek + 40, Math.max(-20, g.current.base + e.clientY - g.current.y0))); };
  const onGrabUp = () => { if (drag == null) return; const o = offsets(), y = drag + Math.max(-1.5, Math.min(1.5, g.current.v)) * 80; const pick = (Object.entries(o) as [typeof sheet, number][]).sort((a, b) => Math.abs(a[1] - y) - Math.abs(b[1] - y))[0][0]; if (Math.abs(drag - g.current.base) > 4) setSheet(pick); setDrag(null); };
  const est = useMemo(() => estimate(c, home), [c, home]);
  const total = useTicker(est.total);
  const [focus, setFocus] = useState<Focus | null>(null);
  const bump = (kind: string) => setFocus((f) => ({ kind, n: (f?.n ?? 0) + 1 }));
  const set = (p: Partial<Home>) => setHome((h) => ({ ...h, ...p }));
  const toggle = (k: "rooms" | "extras", id: string) => { setHome((h) => { const l = h[k] ?? []; return { ...h, [k]: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] }; }); bump(id === "majlis" ? "majlis" : id === "maid" ? "maid" : id === "oven" || id === "fridge" ? "kitchen" : id === "sofa" || id === "carpet" ? "living" : "none"); };
  const areaText = `${fmt(home.sqft)} sq ft`;

  return (
    <LangCtx.Provider value={lang}><MotionConfig reducedMotion="user">

    <main className={`page sheet-${sheet}`}>
      <header className="top">
        <div className="logo">{c.brand.name}</div>
        <div className="langs" role="group" aria-label={t("Language")}>{LANGS.map((x) => <button key={x.id} type="button" lang={x.id} aria-pressed={lang === x.id} onClick={() => setLang(x.id)}>{x.label}</button>)}</div>
      </header>
      <section className="hero">
        <h1>{t("Price your home cleaning")}</h1>
        <p className="sub">{t("Tell us about your home. The price and the model change as you go.")}</p>
      </section>

      <div className="layout">
        <section className="model model-wrap" aria-label="3D model">
          <div className="canvas card">
            <div className="model-head"><h2 className="model-title">{P.title(home.floors)}</h2>
              <p className="home-label" aria-live="polite">{lang === "en" ? homeLabel(c, home).replace(/^A \d floor home: /, "") : sub}</p></div>
            <House home={home} openFloors={openFloors} roof={roof} focus={focus} />
            <div className="toggles">
              <button type="button" className="chip" aria-pressed={openFloors} onClick={() => setOpenFloors((v) => !v)}>{t("Open floors")}</button>
              <button type="button" className="chip" aria-pressed={roof} onClick={() => setRoof((v) => !v)}>{t("Roof")}</button>
            </div>
            <ul className="legend">
              {Object.keys(ROOM_COLORS).map((k) => <li key={k}><i style={{ background: ROOM_COLORS[k] }} />{t(ROOM_NAMES[k])}</li>)}
            </ul>
            <span className="hint"><span className="fine">{t("Drag to turn · scroll to zoom")}</span><span className="coarse">{t("Drag to turn")}</span></span>
          </div>
        </section>
        <div className="sheet" ref={sheetRef} data-state={sheet} style={drag != null ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}>
          <div className="grab" onPointerDown={onGrabDown} onPointerMove={onGrabMove} onPointerUp={onGrabUp} onPointerCancel={onGrabUp}>
            <span className="handle" /><button type="button" className="grab-btn" aria-label={sheet === "full" ? "Show the model" : "Show all options"} onClick={() => setSheet(sheet === "full" ? "half" : "full")} />
          </div>
          <div className="sheet-body" ref={bodyRef}>
        <section className="controls card" aria-label="Your home" ref={formRef} data-end={formEnd} onScroll={checkEnd}>
          <div className="field">
            <div className="row">
              <label className="label" htmlFor="area">{t("Square footage")}</label>
              <span className="range-note">{P.range(fmt(c.sqft.min), fmt(c.sqft.max))}</span>
            </div>
            <div className="slide-row"><input id="area" onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} type="range" min={c.sqft.min} max={c.sqft.max} step={c.sqft.step} value={home.sqft}
              onChange={(e) => set({ sqft: +e.target.value })} aria-valuetext={areaText}
              style={{ "--p": `${((home.sqft - c.sqft.min) / (c.sqft.max - c.sqft.min)) * 100}%` } as React.CSSProperties} />
            <span className="value-box big-value" aria-hidden="true">{fmt(home.sqft)}</span></div>
          </div>
          <div className="field"><span className="label">{t("Floors")}</span>
            <div className="seg floors" role="group" aria-label="Floors">
              {[1, 2, 3].map((f) => <button key={f} type="button" aria-pressed={home.floors === f} onClick={() => set({ floors: f as 1 | 2 | 3 })}>{home.floors === f && <motion.span layoutId="floorPill" className="pill-bg" transition={SPRING} />}<span className="pill-t">{f}</span></button>)}
            </div></div>
          <div className="field steps">
            <Stepper label={t("Bedrooms")} value={home.bedrooms} step={1} min={0} max={8} onChange={(v) => { set({ bedrooms: v }); bump("bedroom"); }} />
            <Stepper label={t("Bathrooms")} value={home.bathrooms} step={0.5} min={1} max={8} onChange={(v) => { set({ bathrooms: v }); bump("bathroom"); }} />
          </div>
          <fieldset className="types">
            <legend className="label">{t("Cleaning type")}</legend>
            {(Object.keys(c.types) as CleanType[]).map((k) => (
              <label key={k} className={`type ${home.type === k ? "on" : ""}`}>
                <input type="radio" name="type" value={k} checked={home.type === k} onChange={() => { set({ type: k }); bump("all"); }} />
                <span className="dot" />
                <span className="tname">{t(c.types[k].label)}<Collapse open={home.type === k}><small>{t(c.types[k].blurb)}</small></Collapse></span>
                <span className="rate">{P.perSqft(money(lang, c.currency, c.types[k].perSqft.toFixed(2)))}</span>
              </label>
            ))}
          </fieldset>
          {(c.rooms || c.extras) && (() => { const n = (home.rooms?.length ?? 0) + (home.extras?.length ?? 0); return (
            <div className="addx"><button type="button" className="sum-btn" aria-expanded={showX} onClick={() => setShowX((v) => !v)}><span>{t("Add extras")}</span><span className="addx-n">{n ? P.added(n) : t("Maid's room, majlis, sofa and more")}</span><span className="chev" aria-hidden="true" /></button>
              <Collapse open={showX}><div className="pills">
                {c.rooms && Object.entries(c.rooms).map(([k, a]) => <button key={k} type="button" className="pill" aria-pressed={!!home.rooms?.includes(k)} onClick={() => toggle("rooms", k)}>{t(a.label)}<small>+{a.price}</small></button>)}
                {c.extras && Object.entries(c.extras).map(([k, a]) => <button key={k} type="button" className="pill" aria-pressed={!!home.extras?.includes(k)} onClick={() => toggle("extras", k)}>{t(a.label)}<small>+{a.price}</small></button>)}
              </div></Collapse>
            </div>); })()}
        </section>
        <section className="summary" aria-label="Your estimate">
          <div className="price-row"><div className="total" aria-live="polite"><small>{lang === "en" ? c.currency : money(lang, c.currency, "").trim()}</small>{fmt(total)}</div>
          <div className="crew">{P.crew(est.hours, est.crew)}</div></div>
          {c.weeklyDiscount ? <button type="button" role="switch" aria-checked={!!home.weekly} className="wk" onClick={() => set({ weekly: !home.weekly })}>
            <span className="sw" aria-hidden="true" />{t("Weekly")} <small>{home.weekly ? P.saved(M(est.saving)) : P.save(Math.round(c.weeklyDiscount * 100))}</small></button> : null}
          <ul className="lines">
            {est.lines.filter((l) => ["area", "bed", "bath"].includes(l.key)).map((l) => (
              <li key={l.key}><span>{lang === "en" ? l.label : lineLabel(l.key, 1)}</span><span>{M(l.amount)}</span></li>
            ))}
          </ul>
          <div className="more-lines"><button type="button" className="sum-btn" aria-expanded={showD} onClick={() => setShowD((v) => !v)}>{t("See details")}<span className="chev" aria-hidden="true" /></button><Collapse open={showD}><ul className="lines">
            {est.lines.filter((l) => !["area", "bed", "bath"].includes(l.key) && l.amount !== 0).map((l) => (
              <li key={l.key}><span>{lang === "en" ? l.label : lineLabel(l.key, 1)}</span><span>{l.amount < 0 ? (lang === "en" ? "minus " : "− ") : ""}{M(Math.abs(l.amount))}</span></li>
            ))}
            {est.subtotal > est.lines.reduce((s, l) => s + l.amount, 0) && <li><span>{t("Minimum visit")}</span><span>{M(est.subtotal)}</span></li>}
            <li><span>{P.vat(Math.round(c.vatRate * 100))}</span><span>{M(est.vat)}</span></li>
          </ul></Collapse></div>
          <button type="button" className="cta" onClick={openBook}>{t("Book this cleaning")}</button>
        </section>
          </div>
        </div>
      </div>

      <div className="mobile-bar">
        <div><div className="small muted">{t("Estimated total")}</div><strong>{M(total)}</strong></div>
        <button type="button" className="cta" onClick={openBook}>{t("Book this cleaning")}</button>
      </div>

      <AnimatePresence>{booking && <BookingModal key="bk" origin={booking} c={c} home={home} est={est} sub={sub} onClose={() => setBooking(null)} />}</AnimatePresence>
    </main>
    </MotionConfig></LangCtx.Provider>
  );
}

function BookingModal({ c, home, est, onClose, origin, sub }: { sub: string; origin: { x: number; y: number }; c: Company; home: Home; est: ReturnType<typeof estimate>; onClose: () => void }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "", date: today(), time: "09:00", notes: "" });
  const { l, t, P } = useL();
  const [tried, setTried] = useState(false), [sent, setSent] = useState(false);
  const phone = typeof window !== "undefined" && window.innerWidth < 640;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLInputElement>("input")?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; prev?.focus(); };
  }, [onClose]);
  const missing = (["name", "phone", "date"] as const).filter((k) => !f[k].trim());
  const phoneBad = f.phone.trim() !== "" && f.phone.replace(/\D/g, "").length < 7;
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setTried(true);
    if (missing.length || phoneBad) return;
    window.open(whatsappUrl(c, home, est, f), "_blank", "noopener"); setSent(true);
  };
  const inp = (k: keyof typeof f, label: string, type = "text", extra: Record<string, string> = {}) => (
    <label className={`in ${tried && (missing.includes(k as never) || (k === "phone" && phoneBad)) ? "bad" : ""}`}>
      <span>{t(label)}</span>
      <input type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} />
      {tried && missing.includes(k as never) && <em>{t("Please fill this in")}</em>}
      {tried && k === "phone" && phoneBad && <em>{t("Please check the number")}</em>}
    </label>
  );
  return (
    <motion.div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }} animate={{ opacity: 1, backdropFilter: "blur(6px)" }} exit={{ opacity: 0, backdropFilter: "blur(0px)" }} transition={{ duration: 0.25 }}>
      <motion.div className="modal" role="dialog" aria-modal="true" aria-labelledby="bk-title" ref={ref}
        initial={phone ? { y: "100%" } : { opacity: 0, scale: 0.4, x: origin.x, y: origin.y }}
        animate={phone ? { y: 0 } : { opacity: 1, scale: 1, x: 0, y: 0 }}
        exit={phone ? { y: "100%" } : { opacity: 0, scale: 0.4, x: origin.x, y: origin.y }}
        transition={SPRING}>
        <AnimatePresence mode="wait" initial={false}>{sent ? (
          <motion.div key="ok" className="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={EASE}>
            <span className="tick" aria-hidden="true" />
            <h2 id="bk-title">{t("Opening WhatsApp")}</h2>
            <p className="muted">{P.sent(c.brand.name)}</p>
            <button type="button" className="cta" onClick={onClose}>{t("Done")}</button>
          </motion.div>
        ) : (<motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
        <button type="button" className="close" aria-label={t("Close")} onClick={onClose}>×</button>
        <h2 id="bk-title">{t("Book this cleaning")}</h2>
        <p className="muted">{t("Pick a day. We confirm the rest on WhatsApp.")}</p>
        <div className="sum">
          <span>{l === "en" ? homeLabel(c, home) : `${P.title(home.floors)}: ${sub}`}<br />{P.crew(est.hours, est.crew)}</span>
          <strong>{money(l, c.currency, fmt(est.total))}</strong>
        </div>
        <form onSubmit={submit} noValidate onKeyDown={(e) => { const el = e.target as HTMLInputElement; if (e.key === "Enter" && el.autocomplete === "name") { e.preventDefault(); el.form?.querySelector<HTMLInputElement>("input[type=tel]")?.focus(); } }}>
          {inp("name", "Full name", "text", { autoComplete: "name", enterKeyHint: "next" })}
          <div className="two">{inp("phone", "Phone", "tel", { autoComplete: "tel", inputMode: "tel", enterKeyHint: "send" })}{inp("date", "Date", "date", { min: today() })}</div>
          <details className="more"><summary>{t("More details (optional)")}</summary>
          <div className="two">{inp("time", "Time", "time")}{inp("email", "Email", "email", { autoComplete: "email" })}</div>
          {inp("address", "Address", "text", { autoComplete: "street-address", placeholder: t("Villa or flat, building, area, emirate") })}
          <label className="in"><span>{t("Notes for the crew")}</span>
            <textarea rows={3} value={f.notes} placeholder={t("Gate code, parking, rooms to skip")} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
          </details>
          <button type="submit" className="cta">{t("Send booking on WhatsApp")}</button>
          <p className="muted small">{t("This opens WhatsApp with your booking written out. Nothing is sent until you press send there.")}</p>
        </form>
        </motion.div>)}</AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
