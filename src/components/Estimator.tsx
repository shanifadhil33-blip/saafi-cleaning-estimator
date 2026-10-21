"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
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
  return (
    <div>
      <span className="label">{label}</span>
      <div className="stepper" role="group" aria-label={label}>
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>+</button>
      </div>
    </div>
  );
}

const today = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

export default function Estimator({ company: c }: { company: Company }) {
  const [home, setHome] = useState<Home>({ sqft: 2800, floors: 3, bedrooms: 1, bathrooms: 1.5, type: "standard" });
  const [openFloors, setOpenFloors] = useState(true);
  const [roof, setRoof] = useState(true);
  const [booking, setBooking] = useState(false);
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
  const onGrabUp = () => { if (drag == null) return; const o = offsets(), y = drag + Math.max(-1.5, Math.min(1.5, g.current.v)) * 120; const pick = (Object.entries(o) as [typeof sheet, number][]).sort((a, b) => Math.abs(a[1] - y) - Math.abs(b[1] - y))[0][0]; if (Math.abs(drag - g.current.base) > 4) setSheet(pick); setDrag(null); };
  const est = useMemo(() => estimate(c, home), [c, home]);
  const total = useTicker(est.total);
  const [focus, setFocus] = useState<Focus | null>(null);
  const bump = (kind: string) => setFocus((f) => ({ kind, n: (f?.n ?? 0) + 1 }));
  const set = (p: Partial<Home>) => setHome((h) => ({ ...h, ...p }));
  const toggle = (k: "rooms" | "extras", id: string) => { setHome((h) => { const l = h[k] ?? []; return { ...h, [k]: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] }; }); bump(id === "majlis" ? "majlis" : id === "maid" ? "maid" : id === "oven" || id === "fridge" ? "kitchen" : id === "sofa" || id === "carpet" ? "living" : "none"); };
  const demoLink = `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(`Hello, I saw the ${c.brand.name} cleaning estimator demo. I would like one for my company.`)}`;
  const areaText = `${fmt(home.sqft)} sq ft`;

  return (
    <>

    <main className={`page sheet-${sheet}`}>
    <div className="banner"><span>This is a demo. Your version gets your logo, colours and prices.</span><a href={demoLink} target="_blank" rel="noopener">Get this for your company</a></div>
      <header className="top">
        <div className="logo">{c.brand.name}</div>
      </header>
      <section className="hero">
        <h1>Price your home cleaning</h1>
        <p className="sub">Tell us about your home. The price and the model update as you go, and you can book when it looks right.</p>
      </section>

      <div className="layout">
        <section className="model model-wrap" aria-label="3D model">
          <div className="canvas card">
            <div className="model-head"><h2 className="model-title">A {home.floors} floor home</h2>
              <p className="home-label" aria-live="polite">{homeLabel(c, home).replace(/^A \d floor home: /, "")}</p></div>
            <House home={home} openFloors={openFloors} roof={roof} focus={focus} />
            <div className="toggles">
              <button type="button" className="chip" aria-pressed={openFloors} onClick={() => setOpenFloors((v) => !v)}>Open floors</button>
              <button type="button" className="chip" aria-pressed={roof} onClick={() => setRoof((v) => !v)}>Roof</button>
            </div>
            <ul className="legend">
              {Object.keys(ROOM_COLORS).map((k) => <li key={k}><i style={{ background: ROOM_COLORS[k] }} />{ROOM_NAMES[k]}</li>)}
            </ul>
            <span className="hint"><span className="fine">Drag to turn · scroll to zoom</span><span className="coarse">Drag to turn</span></span>
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
              <label className="label" htmlFor="area">Square footage</label>
              <span className="range-note">{fmt(c.sqft.min)} to {fmt(c.sqft.max)} sq ft</span>
            </div>
            <div className="slide-row"><input id="area" onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} type="range" min={c.sqft.min} max={c.sqft.max} step={c.sqft.step} value={home.sqft}
              onChange={(e) => set({ sqft: +e.target.value })} aria-valuetext={areaText}
              style={{ "--p": `${((home.sqft - c.sqft.min) / (c.sqft.max - c.sqft.min)) * 100}%` } as React.CSSProperties} />
            <span className="value-box big-value" aria-hidden="true">{fmt(home.sqft)}</span></div>
          </div>
          <div className="field"><span className="label">Floors</span>
            <div className="seg floors" role="group" aria-label="Floors">
              {[1, 2, 3].map((f) => <button key={f} type="button" aria-pressed={home.floors === f} onClick={() => set({ floors: f as 1 | 2 | 3 })}>{f}</button>)}
            </div></div>
          <div className="field steps">
            <Stepper label="Bedrooms" value={home.bedrooms} step={1} min={0} max={8} onChange={(v) => { set({ bedrooms: v }); bump("bedroom"); }} />
            <Stepper label="Bathrooms" value={home.bathrooms} step={0.5} min={1} max={8} onChange={(v) => { set({ bathrooms: v }); bump("bathroom"); }} />
          </div>
          <fieldset className="types">
            <legend className="label">Cleaning type</legend>
            {(Object.keys(c.types) as CleanType[]).map((k) => (
              <label key={k} className={`type ${home.type === k ? "on" : ""}`}>
                <input type="radio" name="type" value={k} checked={home.type === k} onChange={() => { set({ type: k }); bump("all"); }} />
                <span className="dot" />
                <span className="tname">{c.types[k].label}<small>{c.types[k].blurb}</small></span>
                <span className="rate">{c.currency} {c.types[k].perSqft.toFixed(2)} / sq ft</span>
              </label>
            ))}
          </fieldset>
          {c.rooms && <div className="field"><span className="label">Extra rooms</span><div className="pills">
            {Object.entries(c.rooms).map(([k, a]) => <button key={k} type="button" className="pill" aria-pressed={!!home.rooms?.includes(k)} onClick={() => toggle("rooms", k)}>{a.label}<small>+{a.price}</small></button>)}
          </div></div>}
          {c.extras && <div className="field"><span className="label">Extras</span><div className="pills">
            {Object.entries(c.extras).map(([k, a]) => <button key={k} type="button" className="pill" aria-pressed={!!home.extras?.includes(k)} onClick={() => toggle("extras", k)}>{a.label}<small>+{a.price}</small></button>)}
          </div></div>}
          {c.weeklyDiscount ? <div className="field"><span className="label">How often</span>
            <div className="seg" role="group" aria-label="How often">
              <button type="button" aria-pressed={!home.weekly} onClick={() => set({ weekly: false })}>One off</button>
              <button type="button" aria-pressed={!!home.weekly} onClick={() => set({ weekly: true })}>Weekly <small>save {Math.round(c.weeklyDiscount * 100)}%</small></button>
            </div></div> : null}
        </section>
        <section className="summary" aria-label="Your estimate">
          <div className="price-row"><div className="total" aria-live="polite"><small>{c.currency}</small>{fmt(total)}</div>
          <div className="crew">About {est.hours} hours with a crew of {est.crew}{est.saving ? ` · you save ${c.currency} ${fmt(est.saving)} a visit` : ""}</div></div>
          <ul className="lines">
            {est.lines.filter((l) => l.amount > 0 || l.key === "area").map((l) => (
              <li key={l.key}><span>{l.label}</span><span>{l.amount < 0 ? "minus " : ""}{c.currency} {fmt(Math.abs(l.amount))}</span></li>
            ))}
            {est.subtotal > est.lines.reduce((s, l) => s + l.amount, 0) && <li><span>Minimum visit</span><span>{c.currency} {fmt(est.subtotal)}</span></li>}
            <li><span>VAT {Math.round(c.vatRate * 100)}%</span><span>{c.currency} {fmt(est.vat)}</span></li>
          </ul>
          <button type="button" className="cta" onClick={() => setBooking(true)}>Book this cleaning</button>
          <p className="note">A guide price. The crew confirms it on WhatsApp before the visit.</p>
        </section>
          </div>
        </div>
      </div>

      <div className="mobile-bar">
        <div><div className="small muted">Estimated total</div><strong>{c.currency} {fmt(total)}</strong></div>
        <button type="button" className="cta" onClick={() => setBooking(true)}>Book this cleaning</button>
      </div>

      {booking && <BookingModal c={c} home={home} est={est} onClose={() => setBooking(false)} />}
    </main>
    </>
  );
}

function BookingModal({ c, home, est, onClose }: { c: Company; home: Home; est: ReturnType<typeof estimate>; onClose: () => void }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "", date: today(), time: "09:00", notes: "" });
  const [tried, setTried] = useState(false);
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
    window.open(whatsappUrl(c, home, est, f), "_blank", "noopener");
  };
  const inp = (k: keyof typeof f, label: string, type = "text", extra: Record<string, string> = {}) => (
    <label className={`in ${tried && (missing.includes(k as never) || (k === "phone" && phoneBad)) ? "bad" : ""}`}>
      <span>{label}</span>
      <input type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} />
      {tried && missing.includes(k as never) && <em>Please fill this in</em>}
      {tried && k === "phone" && phoneBad && <em>Please check the number</em>}
    </label>
  );
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="bk-title" ref={ref}>
        <button type="button" className="close" aria-label="Close" onClick={onClose}>×</button>
        <h2 id="bk-title">Book this cleaning</h2>
        <p className="muted">Pick a day and tell us where to go.</p>
        <div className="sum">
          <span>{homeLabel(c, home)}<br />About {est.hours} hours with a crew of {est.crew}</span>
          <strong>{c.currency} {fmt(est.total)}</strong>
        </div>
        <form onSubmit={submit} noValidate>
          {inp("name", "Full name", "text", { autoComplete: "name" })}
          <div className="two">{inp("phone", "Phone", "tel", { autoComplete: "tel", inputMode: "tel" })}{inp("date", "Date", "date", { min: today() })}</div>
          <details className="more"><summary>More details (optional)</summary>
          <div className="two">{inp("time", "Time", "time")}{inp("email", "Email", "email", { autoComplete: "email" })}</div>
          {inp("address", "Address", "text", { autoComplete: "street-address", placeholder: "Villa or flat, building, area, emirate" })}
          <label className="in"><span>Notes for the crew</span>
            <textarea rows={3} value={f.notes} placeholder="Gate code, parking, rooms to skip" onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
          </details>
          <button type="submit" className="cta">Send booking on WhatsApp</button>
          <p className="muted small">This opens WhatsApp with your booking written out. Nothing is sent until you press send there.</p>
        </form>
      </div>
    </div>
  );
}
