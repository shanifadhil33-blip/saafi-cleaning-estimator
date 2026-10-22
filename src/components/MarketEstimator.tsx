"use client";
/* US, Canada, and UK estimator. Same quiet monochrome controls as the GCC demo, with bedrooms, bathrooms, or hours. */
import { MotionConfig } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCopy } from "@/lib/marketCopy";
import {
  bookingRef, checkArea, clampState, formatArea, formatMoney, initialState, isQuebecPostal, quote, snapHours, suggestedHours,
  type Freq, type Lang, type Market, type MState,
} from "@/lib/marketQuote";

const store = {
  get: (k: string) => { try { return localStorage.getItem("mkt." + k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem("mkt." + k, v); } catch { /* off */ } },
};
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isLang = (x: string | null): x is Lang => x === "en" || x === "es" || x === "fr";

function countLabel(n: number, max: number, studio: string) {
  if (n === 0) return studio;
  if (n === max && max >= 4) return `${n}+`;
  return String(n);
}
function dayChip(d: Date, months: string[], region: Market["region"]) {
  const mon = months[d.getMonth()];
  return region === "us" ? `${mon} ${d.getDate()}` : `${d.getDate()} ${mon}`;
}
function dayLong(d: Date, region: Market["region"]) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return region === "us" ? `${mm}/${dd}/${y}` : `${dd}/${mm}/${y}`;
}
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function MarketEstimator({ market, choices }: { market: Market; choices: Market[] }) {
  const [active, setActive] = useState(market);
  const [lang, setLang] = useState<Lang>(market.defaultLang);
  const [langLock, setLangLock] = useState(false);
  const [s, setS] = useState<MState>(() => initialState(market));
  const [area, setArea] = useState("");
  const [leaveEmail, setLeaveEmail] = useState("");
  const [noted, setNoted] = useState(false);
  const [when, setWhen] = useState("");
  const [win, setWin] = useState("");
  const [entry, setEntry] = useState(market.entryOrder[0]);
  const [entryNote, setEntryNote] = useState("");
  const [parking, setParking] = useState(market.parkingOrder[0]);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [full, setFull] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [apt, setApt] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [line2, setLine2] = useState("");
  const [notes, setNotes] = useState("");
  const [petNote, setPetNote] = useState("");
  const [terms, setTerms] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [ref] = useState(() => bookingRef());
  const formRef = useRef<HTMLFormElement>(null);
  const t = getCopy(lang, active.region);
  const q = useMemo(() => quote(active, s), [active, s]);
  const money = (cents: number) => formatMoney(cents, active.currency);
  const areaSt = checkArea(active, area);
  const svc = active.services[s.service];
  const today = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }, []);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const bedMax = active.beds[active.beds.length - 1];
  const bathMax = active.baths[active.baths.length - 1];
  const displayName = active.nameShape === "single" ? full.trim() : [first.trim(), last.trim()].filter(Boolean).join(" ");

  useEffect(() => {
    const qLang = new URLSearchParams(window.location.search).get("lang");
    const stored = store.get("lang");
    const allow = (x: string | null): x is Lang => isLang(x) && market.langs.includes(x);
    if (allow(qLang)) { setLang(qLang); setLangLock(true); }
    else if (allow(stored)) { setLang(stored); setLangLock(true); }
  }, [market]);
  useEffect(() => {
    if (langLock) return;
    if (active.areaKind === "ca" && isQuebecPostal(area)) setLang("fr");
  }, [area, active.areaKind, langLock]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";
    document.title = t.title;
  }, [lang, t.title]);

  function pickLang(next: Lang) {
    setLang(next);
    setLangLock(true);
    store.set("lang", next);
  }
  function selectCurrency(next: Market) {
    if (next.id === active.id) return;
    setActive(next);
    setArea("");
    setNoted(false);
    setErrs({});
    setS((prev) => clampState(next, prev));
    setEntry((id) => next.entryOrder.includes(id) ? id : next.entryOrder[0]);
    setParking((id) => next.parkingOrder.includes(id) ? id : next.parkingOrder[0]);
    setLang((cur) => next.langs.includes(cur) ? cur : next.defaultLang);
  }
  function patch(fn: (prev: MState) => MState) { setS((prev) => fn(prev)); }
  function pickHome(id: string) {
    patch((prev) => {
      const beds = id === "studioflat" ? 0 : prev.beds;
      const hours = prev.hoursTouched ? prev.hours : snapHours(suggestedHours(beds, prev.rooms, active.rooms), active.hourChoices);
      return { ...prev, home: id, beds, hours };
    });
  }
  function pickBeds(n: number) {
    patch((prev) => {
      const hours = prev.hoursTouched ? prev.hours : snapHours(suggestedHours(n, prev.rooms, active.rooms), active.hourChoices);
      return { ...prev, beds: n, hours };
    });
  }
  function toggleRoom(id: string) {
    patch((prev) => {
      const rooms = prev.rooms.includes(id) ? prev.rooms.filter((r) => r !== id) : [...prev.rooms, id];
      const hours = prev.hoursTouched ? prev.hours : snapHours(suggestedHours(prev.beds, rooms, active.rooms), active.hourChoices);
      return { ...prev, rooms, hours };
    });
  }
  function setQty(id: string, qty: number) {
    patch((prev) => {
      const extras = { ...prev.extras };
      if (qty <= 0) delete extras[id];
      else extras[id] = Math.min(active.extras[id].max, qty);
      return { ...prev, extras };
    });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (areaSt !== "in") e.area = areaSt === "out" ? t.areaOut : area.trim() ? t.areaBad : t.errArea;
    if (!when) e.date = t.errDate;
    if (!win) e.window = t.errWindow;
    const nameOk = active.nameShape === "single" ? !!full.trim() : !!(first.trim() && last.trim());
    if (!nameOk) e.name = t.errName;
    if (!emailOk(email)) e.email = t.errEmail;
    if (phone.replace(/\D/g, "").length < 7) e.phone = t.errPhone;
    if (!terms) e.terms = t.errTerms;
    return e;
  }
  function focusErr(key: string) {
    const sel: Record<string, string> = {
      area: "#areaCode",
      date: "[data-day] input",
      window: "[data-window] input",
      name: active.nameShape === "single" ? "#fName" : "#fFirst",
      email: "#fEmail",
      phone: "#fPhone",
      terms: "#fTerms",
    };
    formRef.current?.querySelector<HTMLElement>(sel[key])?.focus();
  }
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrs(next);
    const firstKey = ["area", "date", "window", "name", "email", "phone", "terms"].find((k) => next[k]);
    if (firstKey) { focusErr(firstKey); return; }
    setDone(true);
    requestAnimationFrame(() => document.getElementById("doneTitle")?.focus());
  }
  function saveLeave() {
    if (!emailOk(leaveEmail)) { setErrs((er) => ({ ...er, leave: t.errEmail })); return; }
    setErrs((er) => ({ ...er, leave: "" }));
    setNoted(true);
  }

  const pickedDate = when ? days.find((d) => `${d.getFullYear()}${d.getMonth()}${d.getDate()}` === when) ?? null : null;
  const msg = [
    t.msgIntro,
    "",
    `${t.fullName}: ${displayName}`,
    `${t.email}: ${email.trim()}`,
    `${t.mobile}: ${phone.trim()}`,
    street.trim() ? `${t.street}: ${street.trim()}` : "",
    apt.trim() ? `${t.apt}: ${apt.trim()}` : "",
    line2.trim() ? `${t.line2}: ${line2.trim()}` : "",
    city.trim() ? `${active.region === "uk" ? t.town : t.city}: ${city.trim()}` : "",
    stateName.trim() ? `${t.state}: ${stateName.trim()}` : "",
    `${t.area}: ${formatArea(active, area)}`,
    `${t.service}: ${t.services[s.service]?.name ?? s.service}`,
    `${t.home}: ${t.homes[s.home] ?? s.home}`,
    `${t.beds}: ${countLabel(s.beds, bedMax, t.studio)}`,
    `${t.baths}: ${countLabel(s.baths, bathMax, t.studio)}`,
    q.hourly ? `${t.hours}: ${q.hours}` : "",
    svc.discount ? `${t.often}: ${t.freqs[s.freq]}` : "",
    q.lines.length ? `${t.extras}: ${q.lines.map((l) => `${t.extraNames[l.id] ?? l.id}${l.qty > 1 ? ` x ${l.qty}` : ""}`).join(", ")}` : "",
    `${t.total}: ${money(q.totalCents)}`,
    pickedDate ? `${t.when}: ${dayLong(pickedDate, active.region)}` : "",
    win ? `${t.windowsLabel}: ${t.windows[win]}` : "",
    `${t.refLabel}: ${ref}`,
    notes.trim() ? `${t.notes}: ${notes.trim()}` : "",
  ].filter((line) => line !== "").join("\n");

  const links = [
    { id: "tel", href: `tel:${active.contact.phoneTel}`, label: t.call },
    { id: "sms", href: `sms:${active.contact.phoneTel}?body=${encodeURIComponent(msg)}`, label: t.text },
    { id: "mailto", href: `mailto:${active.contact.email}?subject=${encodeURIComponent(t.msgIntro)}&body=${encodeURIComponent(msg)}`, label: t.emailUs },
    ...(active.contact.whatsapp ? [{ id: "whatsapp", href: `https://wa.me/${active.contact.whatsapp}?text=${encodeURIComponent(msg)}`, label: t.whatsapp }] : []),
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="mkt" data-market={active.id} data-lang={lang} data-total={q.totalCents}>
        <div className="mkt-wrap">
          <header className="mkt-top">
            <div className="lang" role="group" aria-label={t.language}>
              {active.langs.map((id) => (
                <button key={id} type="button" lang={id} data-lang-btn={id} aria-pressed={lang === id} onClick={() => pickLang(id)}>{id.toUpperCase()}</button>
              ))}
            </div>
            {choices.length > 1 && (
              <div className="lang" role="group" aria-label={t.currency}>
                {choices.map((c) => (
                  <button key={c.id} type="button" data-currency={c.currency} aria-pressed={active.id === c.id} onClick={() => selectCurrency(c)}>{c.currency}</button>
                ))}
              </div>
            )}
          </header>

          {done ? (
            <section className="mkt-done" id="done" aria-labelledby="doneTitle">
              <div className="done-mark" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 28 28"><path d="M7 14.5l4.6 4.5L21 9.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <h1 id="doneTitle" tabIndex={-1}>{t.doneTitle}</h1>
              <p className="lead">{t.doneBody}</p>
              <p className="hint">{money(q.totalCents)} · {active.contact.phoneDisplay}</p>
              <p className="hint">{active.contact.email}</p>
              <div className="mkt-stack">
                {links.map((l) => <a key={l.id} className="btn primary wide" data-contact={l.id} href={l.href}>{l.label}</a>)}
                <button type="button" className="btn ghost wide" onClick={() => setDone(false)}>{t.edit}</button>
              </div>
            </section>
          ) : (
            <>
              <h1>{t.title}</h1>
              <p className="lead">{t.lead}</p>
              <form ref={formRef} className="mkt-form" method="post" noValidate onSubmit={onSubmit}>
                <fieldset>
                  <legend id="areaLbl">{t.area}</legend>
                  <input id="areaCode" className="input" name="postal-code" autoComplete="postal-code" autoCorrect="off" autoCapitalize={active.areaKind === "zip" ? "off" : "characters"} spellCheck={false} inputMode={active.areaKind === "zip" ? "numeric" : "text"} enterKeyHint="next" placeholder={t.areaPh} aria-invalid={errs.area ? true : undefined} aria-describedby={errs.area || areaSt === "out" ? "areaMsg" : undefined} value={area} onChange={(e) => { setArea(e.target.value); setNoted(false); setErrs((er) => ({ ...er, area: "" })); }} onBlur={() => { const st = checkArea(active, area); if (!area.trim() || st === "in" || st === "partial") return; setErrs((er) => ({ ...er, area: st === "out" ? t.areaOut : t.areaBad })); }} />
                  {areaSt === "out" ? <p className="err show" id="areaMsg" role="alert">{t.areaOut}</p> : errs.area ? <p className="err show" id="areaMsg" role="alert">{errs.area}</p> : null}
                  {areaSt === "out" && (
                    <div className="field">
                      <label htmlFor="areaEmail">{t.areaMail}</label>
                      <input id="areaEmail" className="input" type="email" name="email-out" autoComplete="email" autoCapitalize="off" spellCheck={false} enterKeyHint="done" placeholder={t.areaMailPh} aria-invalid={errs.leave ? true : undefined} value={leaveEmail} onChange={(e) => { setLeaveEmail(e.target.value); setErrs((er) => ({ ...er, leave: "" })); }} />
                      {errs.leave ? <p className="err show" role="alert">{errs.leave}</p> : null}
                      <button type="button" className="btn ghost" id="areaSave" onClick={saveLeave}>{t.areaSave}</button>
                      {noted ? <p className="hint">{t.areaNoted}</p> : null}
                    </div>
                  )}
                </fieldset>

                <fieldset>
                  <legend id="serviceLbl">{t.service}</legend>
                  <div className="types" role="radiogroup" aria-labelledby="serviceLbl">
                    {active.serviceOrder.map((id) => {
                      const copy = t.services[id];
                      return (
                        <label key={id} className="type" data-service={id}>
                          <input className="visually-hidden" type="radio" name="service" value={id} checked={s.service === id} onChange={() => patch((prev) => ({ ...prev, service: id, freq: active.services[id].discount ? prev.freq : "once" }))} />
                          <span className="radio" aria-hidden="true" />
                          <span className="type-body">
                            <span className="type-name">{copy?.name ?? id}</span>
                            {s.service === id && copy && <ul className="mkt-items">{copy.items.map((item) => <li key={item}>{item}</li>)}</ul>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <legend id="homeLbl">{t.home}</legend>
                  <div className="kinds">
                    {active.homeOrder.map((id) => (
                      <label key={id} className="kind" data-home={id}>
                        <input className="visually-hidden" type="radio" name="home" value={id} checked={s.home === id} onChange={() => pickHome(id)} />
                        <span>{t.homes[id] ?? id}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend id="bedsLbl">{t.beds}</legend>
                  <div className="chips">
                    {active.beds.map((n) => (
                      <label key={n} className="chip" data-bed={n}>
                        <input className="visually-hidden" type="radio" name="beds" value={n} disabled={s.home === "studioflat" && n !== 0} checked={s.beds === n} onChange={() => pickBeds(n)} />
                        {countLabel(n, bedMax, t.studio)}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend id="bathsLbl">{t.baths}</legend>
                  <div className="chips">
                    {active.baths.map((n) => (
                      <label key={n} className="chip" data-bath={n}>
                        <input className="visually-hidden" type="radio" name="baths" value={n} checked={s.baths === n} onChange={() => patch((prev) => ({ ...prev, baths: n }))} />
                        {countLabel(n, bathMax, t.studio)}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {active.sizeOrder.length > 0 && (
                  <fieldset>
                    <legend>{t.size} <span className="hint">{t.optional}</span></legend>
                    <div className="chips">
                      {active.sizeOrder.map((id) => (
                        <label key={id} className="chip" data-size={id}>
                          <input className="visually-hidden" type="radio" name="size" value={id} checked={s.size === id} onChange={() => patch((prev) => ({ ...prev, size: id }))} />
                          {t.sizes[id] ?? id}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                {active.conditionOrder.length > 0 && svc.mode !== "hourly" && (
                  <fieldset>
                    <legend>{t.condition} <span className="hint">{t.optional}</span></legend>
                    <div className="chips">
                      {active.conditionOrder.map((id) => (
                        <label key={id} className="chip" data-condition={id}>
                          <input className="visually-hidden" type="radio" name="condition" value={id} checked={s.condition === id} onChange={() => patch((prev) => ({ ...prev, condition: id }))} />
                          {t.conditions[id] ?? id}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                {svc.mode === "hourly" && (
                  <fieldset>
                    <legend>{t.hours}</legend>
                    <div className="chips">
                      {active.hourChoices.map((h) => (
                        <label key={h} className="chip" data-hours={h}>
                          <input className="visually-hidden" type="radio" name="hours" value={h} checked={s.hours === h} onChange={() => patch((prev) => ({ ...prev, hours: h, hoursTouched: true }))} />
                          {h === active.hourChoices[active.hourChoices.length - 1] ? `${h}+` : h}
                        </label>
                      ))}
                    </div>
                    <p className="hint">{t.hoursHint(s.beds)}</p>
                  </fieldset>
                )}

                {active.roomOrder.length > 0 && (
                  <fieldset>
                    <legend>{t.rooms} <span className="hint">{t.optional}</span></legend>
                    <div className="chips">
                      {active.roomOrder.map((id) => (
                        <label key={id} className="chip" data-room={id}>
                          <input className="visually-hidden" type="checkbox" name="room" value={id} checked={s.rooms.includes(id)} onChange={() => toggleRoom(id)} />
                          {t.roomNames[id] ?? id}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                {svc.discount ? (
                  <fieldset>
                    <legend id="freqLbl">{t.often}</legend>
                    <div className="chips">
                      {(["once", "weekly", "biweekly", "monthly"] as Freq[]).map((id) => (
                        <label key={id} className="chip" data-freq={id}>
                          <input className="visually-hidden" type="radio" name="freq" value={id} checked={s.freq === id} onChange={() => patch((prev) => ({ ...prev, freq: id }))} />
                          <span>{t.freqs[id]}{id !== "once" ? <small>{t.save(Math.round(active.discounts[id] * 100))}</small> : null}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : <p className="hint">{t.freqOff}</p>}

                {active.weekendPerHour > 0 && svc.mode === "hourly" && (
                  <fieldset>
                    <legend>{t.weekend}</legend>
                    <label className="chip" data-weekend="1">
                      <input className="visually-hidden" type="checkbox" name="weekend" checked={s.weekend} onChange={() => patch((prev) => ({ ...prev, weekend: !prev.weekend }))} />
                      {t.weekend} <small>+{money(Math.round(active.weekendPerHour * 100))}</small>
                    </label>
                  </fieldset>
                )}

                <fieldset>
                  <legend>{t.supplies}</legend>
                  <div className="chips">
                    <label className="chip">
                      <input className="visually-hidden" type="radio" name="supplies" value="bring" checked={s.products} onChange={() => patch((prev) => ({ ...prev, products: true }))} />
                      {t.supplyYes}{active.productsPerHour > 0 ? <small>+{money(Math.round(active.productsPerHour * 100))}</small> : null}
                    </label>
                    <label className="chip">
                      <input className="visually-hidden" type="radio" name="supplies" value="own" checked={!s.products} onChange={() => patch((prev) => ({ ...prev, products: false }))} />
                      {t.supplyNo}
                    </label>
                  </div>
                </fieldset>

                <fieldset>
                  <legend>{t.extras} <span className="hint">{t.optional}</span></legend>
                  <div className="extras">
                    {active.extraOrder.map((id) => {
                      const cfg = active.extras[id];
                      const qty = s.extras[id] || 0;
                      return (
                        <div key={id} className="mkt-xrow">
                          <label className="extra" data-extra={id} data-price={cfg.price}>
                            <input className="visually-hidden" type="checkbox" name="extra" value={id} checked={qty > 0} onChange={() => setQty(id, qty > 0 ? 0 : 1)} />
                            <span className="tick" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                            <span className="name">{t.extraNames[id] ?? id}</span>
                            <span className="amt">{money(Math.round(cfg.price * 100))}{cfg.max > 1 ? ` ${t.each}` : ""}</span>
                          </label>
                          {cfg.max > 1 && qty > 0 && (
                            <div className="mkt-qty" role="group" aria-label={t.extraNames[id] ?? id}>
                              <button type="button" className="step-btn" aria-label={`${t.fewer} ${t.extraNames[id] ?? id}`} onClick={() => setQty(id, qty - 1)}><Minus /></button>
                              <span>{qty}</span>
                              <button type="button" className="step-btn" aria-label={`${t.more} ${t.extraNames[id] ?? id}`} disabled={qty >= cfg.max} onClick={() => setQty(id, qty + 1)}><Plus /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <legend>{t.pets}</legend>
                  <div className="chips">
                    {(["none", "dog", "cat", "other"] as const).map((id) => (
                      <label key={id} className="chip" data-pet={id}>
                        <input className="visually-hidden" type="radio" name="pets" value={id} checked={s.pets === id} onChange={() => patch((prev) => ({ ...prev, pets: id }))} />
                        {t.petOpt[id]}
                      </label>
                    ))}
                  </div>
                  {s.pets !== "none" && (
                    <div className="field">
                      <label className="mkt-check"><input type="checkbox" name="pets-away" checked={s.petsAway} onChange={() => patch((prev) => ({ ...prev, petsAway: !prev.petsAway }))} />{t.petsAway}</label>
                      <label htmlFor="petNote">{t.notes} <span className="hint">{t.optional}</span></label>
                      <input id="petNote" className="input" name="pet-note" maxLength={160} value={petNote} onChange={(e) => setPetNote(e.target.value)} />
                    </div>
                  )}
                </fieldset>

                <fieldset>
                  <legend id="dateLbl">{t.when}</legend>
                  <div className="chips days" role="radiogroup" aria-labelledby="dateLbl">
                    {days.map((d, i) => {
                      const key = `${d.getFullYear()}${d.getMonth()}${d.getDate()}`;
                      const label = i === 0 ? t.today : i === 1 ? t.tomorrow : dayChip(d, t.months, active.region);
                      return (
                        <label key={key} className="chip" data-day={i === 0 ? "today" : i === 1 ? "tomorrow" : "later"}>
                          <input className="visually-hidden" type="radio" name="date" value={key} checked={when === key} onChange={() => { setWhen(key); setErrs((er) => ({ ...er, date: "" })); }} />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                  {errs.date ? <p className="err show" role="alert">{errs.date}</p> : null}
                </fieldset>

                <fieldset>
                  <legend id="windowLbl">{t.windowsLabel}</legend>
                  <div className="chips">
                    {Object.entries(t.windows).map(([id, label]) => (
                      <label key={id} className="chip" data-window={id}>
                        <input className="visually-hidden" type="radio" name="window" value={id} checked={win === id} onChange={() => { setWin(id); setErrs((er) => ({ ...er, window: "" })); }} />
                        {label}
                      </label>
                    ))}
                  </div>
                  {errs.window ? <p className="err show" role="alert">{errs.window}</p> : null}
                </fieldset>

                <fieldset>
                  <legend>{t.entry}</legend>
                  <div className="chips">
                    {active.entryOrder.map((id) => (
                      <label key={id} className="chip" data-entry={id}>
                        <input className="visually-hidden" type="radio" name="entry" value={id} checked={entry === id} onChange={() => setEntry(id)} />
                        {t.entries[id] ?? id}
                      </label>
                    ))}
                  </div>
                  {entry === "other" && <input className="input" name="entry-note" maxLength={160} placeholder={t.entryPh} aria-label={t.entryPh} value={entryNote} onChange={(e) => setEntryNote(e.target.value)} />}
                </fieldset>

                <fieldset>
                  <legend>{t.parking}</legend>
                  <div className="chips">
                    {active.parkingOrder.map((id) => (
                      <label key={id} className="chip" data-parking={id}>
                        <input className="visually-hidden" type="radio" name="parking" value={id} checked={parking === id} onChange={() => setParking(id)} />
                        {t.parks[id] ?? id}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend>{t.contact}</legend>
                  {active.nameShape === "single" ? (
                    <Field id="fName" label={t.fullName} name="name" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={full} error={errs.name} onChange={(v) => { setFull(v); setErrs((er) => ({ ...er, name: "" })); }} />
                  ) : (
                    <div className="two">
                      <Field id="fFirst" label={t.first} name="given-name" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" value={first} error={errs.name && !first.trim() ? errs.name : ""} onChange={(v) => { setFirst(v); setErrs((er) => ({ ...er, name: "" })); }} />
                      <Field id="fLast" label={t.last} name="family-name" autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" value={last} error={errs.name && first.trim() && !last.trim() ? errs.name : ""} onChange={(v) => { setLast(v); setErrs((er) => ({ ...er, name: "" })); }} />
                    </div>
                  )}
                  <Field id="fEmail" label={t.email} name="email" type="email" autoComplete="email" autoCapitalize="off" spellCheck={false} enterKeyHint="next" value={email} error={errs.email} onBlur={() => { if (email.trim() && !emailOk(email)) setErrs((er) => ({ ...er, email: t.errEmail })); }} onChange={(v) => { setEmail(v); setErrs((er) => ({ ...er, email: "" })); }} />
                  <Field id="fPhone" label={t.mobile} name="tel" type="tel" autoComplete="tel" inputMode="tel" enterKeyHint="next" value={phone} error={errs.phone} onChange={(v) => { setPhone(v); setErrs((er) => ({ ...er, phone: "" })); }} />
                  <Field id="fStreet" label={`${active.region === "uk" ? t.street : t.street} (${t.optional})`} name="address-line1" autoComplete="address-line1" enterKeyHint="next" value={street} onChange={setStreet} />
                  {active.region === "uk" ? (
                    <>
                      <Field id="fLine2" label={`${t.line2} (${t.optional})`} name="address-line2" autoComplete="address-line2" enterKeyHint="next" value={line2} onChange={setLine2} />
                      <Field id="fCity" label={`${t.town} (${t.optional})`} name="address-level2" autoComplete="address-level2" enterKeyHint="next" value={city} onChange={setCity} />
                    </>
                  ) : (
                    <>
                      <Field id="fApt" label={`${t.apt} (${t.optional})`} name="address-line2" autoComplete="address-line2" enterKeyHint="next" value={apt} onChange={setApt} />
                      <div className="two">
                        <Field id="fCity" label={`${t.city} (${t.optional})`} name="address-level2" autoComplete="address-level2" enterKeyHint="next" value={city} onChange={setCity} />
                        <Field id="fState" label={`${t.state} (${t.optional})`} name="address-level1" autoComplete="address-level1" enterKeyHint="next" value={stateName} onChange={setStateName} />
                      </div>
                    </>
                  )}
                  <div className="field">
                    <label htmlFor="fNotes">{t.notes} <span className="hint">{t.optional}</span></label>
                    <textarea id="fNotes" className="input" name="notes" rows={3} maxLength={400} enterKeyHint="done" placeholder={t.notesPh} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </fieldset>

                {active.showTip && (
                  <fieldset>
                    <legend>{t.tipLine}</legend>
                    <p className="hint">{t.tip}</p>
                    <div className="chips">
                      {[[0, t.tipNone], [0.1, "10%"], [0.15, "15%"], [0.2, "20%"]] .map(([v, label]) => (
                        <label key={String(v)} className="chip" data-tip={v}>
                          <input className="visually-hidden" type="radio" name="tip" value={String(v)} checked={s.tip === v} onChange={() => patch((prev) => ({ ...prev, tip: Number(v) }))} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                <fieldset className="mkt-summary" aria-label={t.summary}>
                  <legend>{t.summary}</legend>
                  <ul className="lines">
                    <li><span>{t.cleaning}</span><span>{money(q.cleaningCents)}</span></li>
                    {q.discountCents > 0 && <li><span>{t.freqs[s.freq]}</span><span>{t.off(money(q.discountCents))}</span></li>}
                    {q.weekendCents > 0 && <li><span>{t.weekendLine}</span><span>{money(q.weekendCents)}</span></li>}
                    {q.productsCents > 0 && <li><span>{t.productsLine}</span><span>{money(q.productsCents)}</span></li>}
                    {q.lines.map((l) => <li key={l.id}><span>{t.extraNames[l.id] ?? l.id}{l.qty > 1 ? ` x ${l.qty}` : ""}</span><span>{money(l.cents)}</span></li>)}
                    {q.tipCents > 0 && <li><span>{t.tipLine}</span><span>{money(q.tipCents)}</span></li>}
                    <li className="total"><span>{t.total}</span><span>{money(q.totalCents)}</span></li>
                  </ul>
                  <p className="hint" id="fromLine">{t.from(money(q.fromCents))}</p>
                  {s.freq !== "once" && svc.discount ? <p className="hint">{t.thenPer(money(q.totalCents))}</p> : null}
                  {active.showTax ? <p className="hint">{t.tax}</p> : null}
                  <p className="hint">{t.confirmed}</p>
                </fieldset>

                <fieldset>
                  <legend>{t.payTitle}</legend>
                  <p className="hint">{t.payBody}</p>
                  {active.payment === "card" && (
                    <div className="field">
                      <label htmlFor="ccName">{t.cardName} <span className="hint">{t.optional}</span></label>
                      <input id="ccName" className="input" autoComplete="cc-name" enterKeyHint="next" />
                      <label htmlFor="ccNum">{t.cardNumber}</label>
                      <input id="ccNum" className="input" inputMode="numeric" autoComplete="cc-number" autoCorrect="off" spellCheck={false} maxLength={19} placeholder="0000 0000 0000 0000" enterKeyHint="next" />
                      <div className="two">
                        <div className="field">
                          <label htmlFor="ccExp">{t.cardExp}</label>
                          <input id="ccExp" className="input" autoComplete="cc-exp" inputMode="numeric" placeholder="MM YY" enterKeyHint="next" />
                        </div>
                        <div className="field">
                          <label htmlFor="ccCvc">{t.cardCvc}</label>
                          <input id="ccCvc" className="input" autoComplete="cc-csc" inputMode="numeric" maxLength={4} enterKeyHint="done" />
                        </div>
                      </div>
                    </div>
                  )}
                </fieldset>

                <label className="mkt-check">
                  <input id="fTerms" type="checkbox" name="terms" checked={terms} aria-invalid={errs.terms ? true : undefined} onChange={(e) => { setTerms(e.target.checked); setErrs((er) => ({ ...er, terms: "" })); }} />
                  <span>{t.terms}</span>
                </label>
                {errs.terms ? <p className="err show" role="alert">{errs.terms}</p> : null}

                <div className="mkt-bar">
                  <div className="mkt-bar-price">
                    <span className="price" aria-live="polite">{money(q.totalCents)}</span>
                    <span className="mkt-per">{svc.discount && s.freq !== "once" ? t.perVisit : t.oneTime}</span>
                  </div>
                  <button type="submit" className="btn primary" id="requestBtn">{t.request}</button>
                </div>
              </form>
            </>
          )}

          <nav className="mkt-regions" aria-label={t.regionsNav}>
            {(["us", "ca", "uk"] as const).map((id) => (
              <a key={id} href={`/${id}`} aria-current={market.id === id ? "page" : undefined}>{t.regions[id]}</a>
            ))}
          </nav>
        </div>
      </div>
    </MotionConfig>
  );
}

function Field({ id, label, value, onChange, error, onBlur, type = "text", ...rest }: {
  id: string; label: string; value: string; onChange: (v: string) => void; error?: string; onBlur?: () => void; type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" type={type} value={value} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} {...rest} />
      {error ? <p className="err show" id={`${id}-err`} role="alert">{error}</p> : null}
    </div>
  );
}
function Minus() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}
function Plus() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}
