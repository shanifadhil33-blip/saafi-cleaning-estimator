"use client";

import { useState } from "react";
import type { GeoPoint } from "@/lib/phone";

type Status = "idle" | "finding" | "denied" | "unavailable";

export function ShareLocation({
  share, finding, added, remove, denied, unavailable, value, onChange,
}: {
  share: string;
  finding: string;
  added: string;
  remove: string;
  denied: string;
  unavailable: string;
  value: GeoPoint | null;
  onChange: (next: GeoPoint | null) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const note = status === "denied" ? denied : status === "unavailable" ? unavailable : "";

  const ask = () => {
    const geo = typeof navigator === "undefined" ? undefined : navigator.geolocation;
    if (!geo) {
      setStatus("unavailable");
      return;
    }
    setStatus("finding");
    geo.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("idle");
      },
      (err) => {
        setStatus(err.code === 1 ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  if (value) {
    return (
      <div className="loc-field" data-loc="added">
        <div className="loc-added" role="status">
          <span className="loc-tick" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span>{added}</span>
          <button type="button" className="loc-remove" id="locRemove" onClick={() => { onChange(null); setStatus("idle"); }}>{remove}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="loc-field" data-loc={status}>
      <button type="button" className="loc-btn" id="shareLoc" onClick={ask} disabled={status === "finding"} aria-busy={status === "finding" || undefined} aria-describedby={note ? "locNote" : undefined}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.7a4.1 4.1 0 0 0-4.1 4.1c0 3.1 4.1 8.4 4.1 8.4s4.1-5.3 4.1-8.4A4.1 4.1 0 0 0 8 1.7Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><circle cx="8" cy="5.7" r="1.25" fill="currentColor" /></svg>
        <span>{status === "finding" ? finding : share}</span>
      </button>
      {note ? <p className="note" id="locNote" role="status">{note}</p> : null}
    </div>
  );
}
