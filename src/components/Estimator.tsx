"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { estimate, fmt, homeLabel, sqftToSqm, whatsappUrl, type Company, type Home, type CleanType } from "@/lib/engine";
import { ROOM_COLORS, ROOM_NAMES } from "./rooms";

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
    <div className="field row">
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
  const [home, setHome] = useState<Home>({ sqft: c.sqft.default, floors: 2, bedrooms: 3, bathrooms: 2.5, type: "standard" });
  const [unit, setUnit] = useState<"sqft" | "sqm">("sqft");
  const [openFloors, setOpenFloors] = useState(false);
  const [roof, setRoof] = useState(false);
  const [booking, setBooking] = useState(false);
  const est = useMemo(() => estimate(c, home), [c, home]);
  const total = useTicker(est.total);
  const set = (p: Partial<Home>) => setHome((h) => ({ ...h, ...p }));
  const areaText = unit === "sqft" ? `${fmt(home.sqft)} sq ft` : `${fmt(sqftToSqm(home.sqft))} sq m`;
  const style = { "--accent": c.brand.accent, "--bg": c.brand.bg, "--surface": c.brand.surface } as React.CSSProperties;

  return (
    <main className="page" style={style}>
      <header className="top">
        <div className="logo"><span className="mark">{c.brand.logoText}</span>{c.brand.name}</div>
        <span className="muted small">{c.brand.tagline}</span>
      </header>
      <section className="hero">
        <h1>{c.brand.name} Cleaning Estimator: <span className="accent">Price your home cleaning</span></h1>
        <p className="sub">Tell us about your home. The price and the model of your house change as you type. You can book the cleaning when the estimate looks right.</p>
      </section>

      <div className="layout">
        <section className="panel controls" aria-label="Your home">
          <div className="field">
            <div className="row">
              <label className="label" htmlFor="area">Home size</label>
              <div className="seg small-seg" role="group" aria-label="Unit">
                <button type="button" aria-pressed={unit === "sqft"} onClick={() => setUnit("sqft")}>sq ft</button>
                <button type="button" aria-pressed={unit === "sqm"} onClick={() => setUnit("sqm")}>sq m</button>
              </div>
            </div>
            <div className="big-value">{areaText}</div>
            <input id="area" type="range" min={c.sqft.min} max={c.sqft.max} step={c.sqft.step} value={home.sqft}
              onChange={(e) => set({ sqft: +e.target.value })} aria-valuetext={areaText}
              style={{ "--p": `${((home.sqft - c.sqft.min) / (c.sqft.max - c.sqft.min)) * 100}%` } as React.CSSProperties} />
            <div className="row muted small"><span>{unit === "sqft" ? `${fmt(c.sqft.min)} sq ft` : `${sqftToSqm(c.sqft.min)} sq m`}</span><span>{unit === "sqft" ? `${fmt(c.sqft.max)} sq ft` : `${sqftToSqm(c.sqft.max)} sq m`}</span></div>
          </div>

          <div className="field row">
            <span className="label">Floors</span>
            <div className="seg" role="group" aria-label="Floors">
              {[1, 2, 3].map((f) => <button key={f} type="button" aria-pressed={home.floors === f} onClick={() => set({ floors: f as 1 | 2 | 3 })}>{f}</button>)}
            </div>
          </div>
          <Stepper label="Bedrooms" value={home.bedrooms} step={1} min={0} max={8} onChange={(v) => set({ bedrooms: v })} />
          <Stepper label="Bathrooms" value={home.bathrooms} step={0.5} min={1} max={8} onChange={(v) => set({ bathrooms: v })} />

          <fieldset className="field types">
            <legend className="label">Cleaning type</legend>
            {(Object.keys(c.types) as CleanType[]).map((k) => (
              <label key={k} className={`type ${home.type === k ? "on" : ""}`}>
                <input type="radio" name="type" value={k} checked={home.type === k} onChange={() => set({ type: k })} />
                <span className="dot" />
                <span className="tname">{c.types[k].label}<small>{c.types[k].blurb}</small></span>
                <span className="rate">{c.currency} {c.types[k].perSqft.toFixed(2)}<small>per sq ft</small></span>
              </label>
            ))}
          </fieldset>
        </section>

        <section className="panel model" aria-label="3D model">
          <div className="canvas"><House home={home} openFloors={openFloors} roof={roof} /></div>
          <div className="model-bar">
            <p className="home-label" aria-live="polite">{homeLabel(c, home, unit)}</p>
            <div className="toggles">
              <button type="button" className="chip" aria-pressed={openFloors} onClick={() => setOpenFloors((v) => !v)}>Open floors</button>
              <button type="button" className="chip" aria-pressed={roof} onClick={() => setRoof((v) => !v)}>Roof</button>
            </div>
            <ul className="legend">
              {Object.keys(ROOM_COLORS).map((k) => <li key={k}><i style={{ background: ROOM_COLORS[k] }} />{ROOM_NAMES[k]}</li>)}
            </ul>
          </div>
        </section>

        <section className="panel summary" aria-label="Your estimate">
          <div className="label">Estimated total</div>
          <div className="total" aria-live="polite"><small>{c.currency}</small> {fmt(total)}</div>
          <div className="muted">About {est.hours} hours with a crew of {est.crew}</div>
          <table className="lines">
            <tbody>
              {est.lines.map((l) => (
                <tr key={l.key}><th>{l.label}<small>{l.qty}</small></th><td>{fmt(l.amount)}</td></tr>
              ))}
              {est.subtotal > est.lines.reduce((s, l) => s + l.amount, 0) && <tr><th>Minimum visit</th><td>{fmt(est.subtotal)}</td></tr>}
              <tr><th>VAT {Math.round(c.vatRate * 100)}%</th><td>{fmt(est.vat)}</td></tr>
            </tbody>
          </table>
          <button type="button" className="cta" onClick={() => setBooking(true)}>Book this cleaning</button>
          <p className="muted small">A guide price. The crew confirms it on WhatsApp before the visit.</p>
        </section>
      </div>

      <div className="mobile-bar">
        <div><div className="small muted">Estimated total</div><strong>{c.currency} {fmt(total)}</strong></div>
        <button type="button" className="cta" onClick={() => setBooking(true)}>Book this cleaning</button>
      </div>

      {booking && <BookingModal c={c} home={home} unit={unit} total={est.total} est={est} onClose={() => setBooking(false)} />}
    </main>
  );
}

function BookingModal({ c, home, unit, est, onClose }: { c: Company; home: Home; unit: "sqft" | "sqm"; total: number; est: ReturnType<typeof estimate>; onClose: () => void }) {
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
  const missing = (["name", "phone", "address", "date", "time"] as const).filter((k) => !f[k].trim());
  const phoneBad = f.phone.trim() !== "" && f.phone.replace(/\D/g, "").length < 7;
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setTried(true);
    if (missing.length || phoneBad) return;
    window.open(whatsappUrl(c, home, est, f, unit), "_blank", "noopener");
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
          <span>{homeLabel(c, home, unit)}</span>
          <strong>{c.currency} {fmt(est.total)}</strong>
          <span className="muted small">About {est.hours} hours with a crew of {est.crew}</span>
        </div>
        <form onSubmit={submit} noValidate>
          {inp("name", "Full name", "text", { autoComplete: "name" })}
          <div className="two">{inp("phone", "Phone", "tel", { autoComplete: "tel", inputMode: "tel" })}{inp("email", "Email (optional)", "email", { autoComplete: "email" })}</div>
          {inp("address", "Address", "text", { autoComplete: "street-address", placeholder: "Villa or flat, building, area, emirate" })}
          <div className="two">{inp("date", "Date", "date", { min: today() })}{inp("time", "Time", "time")}</div>
          <label className="in"><span>Notes for the crew</span>
            <textarea rows={3} value={f.notes} placeholder="Gate code, parking, rooms to skip" onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
          <button type="submit" className="cta wa">Send booking on WhatsApp</button>
          <p className="muted small">This opens WhatsApp with your booking written out. Nothing is sent until you press send there.</p>
        </form>
      </div>
    </div>
  );
}
