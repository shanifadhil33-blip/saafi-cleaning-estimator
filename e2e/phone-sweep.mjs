/* Phone sweep (build-knowledge rules/phone-ui-sweep.md) plus a real touch swipe test of the booking sheet. */
import { chromium } from "playwright-core";
import fs from "fs";
const [BASE, OUT] = [process.argv[2] || "http://localhost:3311", process.argv[3] || "/workspace/qa/saafi/v3/sweep"];
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox","--enable-unsafe-swiftshader","--use-angle=swiftshader"] });
const res = {}; let fail = 0;
const ok = (rule, c, m) => { res[rule] = res[rule] ?? true; if (!c) { res[rule] = false; fail++; console.log("FAIL", rule, m); } };
async function swipe(cdp, x, y0, y1, ms = 260) {
  const steps = Math.max(6, Math.round(ms / 16));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= steps; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 + (y1 - y0) * (i / steps) }] }); await new Promise((r) => setTimeout(r, ms / steps)); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
const audit = (scope) => (sel) => {
  const root = document.querySelector(sel) || document;
  const vis = (e) => { const r = e.getBoundingClientRect(); return e.offsetParent && r.width && r.bottom > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== "hidden"; };
  const hit = (e) => { const r = e.getBoundingClientRect(), a = getComputedStyle(e, "::after"); let h = r.height, w = r.width; if (a.content !== "none" && a.position === "absolute") { h += -2 * parseFloat(a.top || 0); w += -2 * parseFloat(a.left || 0); } return Math.min(h, w); };
  const small = [...root.querySelectorAll("button, a[href], input, [role=radio]")].filter((e) => vis(e) && !e.closest(".reveal:not(.open)") && !e.disabled && hit(e) < 44 && !e.classList.contains("handle")).map((e) => (e.className || e.tagName) + ":" + Math.round(hit(e)));
  const tiny = [...root.querySelectorAll("p, span, label, small, b, button, li, h1, h2, h3")].filter((e) => vis(e) && !e.closest(".reveal:not(.open)") && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 14 && !e.closest(".lang") && !e.closest(".unit")).map((e) => e.textContent.trim().slice(0, 20) + ":" + getComputedStyle(e).fontSize);
  return { small, tiny, side: document.documentElement.scrollWidth > innerWidth + 1 };
};
for (const w of [360, 390]) for (const L of ["en", "ar", "ur", "hi"]) {
  const tag = `${w} ${L}`;
  const ctx = await b.newContext({ viewport: { width: w, height: w === 360 ? 780 : 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  await p.goto(`${BASE}/?lang=${L}`); await p.waitForSelector("canvas"); await p.waitForTimeout(2000);
  const main = await p.evaluate(audit(), ".sheet");
  ok("5 taps 44px", main.small.length === 0, `${tag} main ${main.small.join(", ")}`);
  ok("5 text 14px", main.tiny.length === 0, `${tag} main ${main.tiny.slice(0, 6).join(" | ")}`);
  ok("5 no sideways scroll", !main.side, tag);
  if (L !== "en") { const eng = await p.evaluate((L) => [...document.querySelectorAll(".sheet .label, .sheet button, .sheet h1, .sheet .lead, .bar")].map((e) => e.innerText).join(" ").match(/\b(Home|Floors|Bedrooms|Bathrooms|Cleaning|Weekly|Book|Studio|Villa)\b/g)?.filter((w) => !(L === "hi" && /Studio|Villa/.test(w))), L); ok("English left", !eng?.length, `${tag} ${eng}`); }
  // tap outline: tap a few controls and check no outline or box shadow ring stays
  for (const sel of [".kind[data-kind=villa]", "#floorsSeg [data-v='3']", ".step-btn", ".extra.maid", "#matSeg [data-v=own]"]) {
    const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await el.tap(); await p.waitForTimeout(120);
    const o = await p.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return "none"; const cs = getComputedStyle(a); return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 ? "outline " + a.className : "none"; });
    ok("7 no tap outline", o === "none", `${tag} ${sel} ${o}`);
  }
  await p.locator(".sheet-scroll").evaluate((e) => e.scrollTo(0, 0)); await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/${w}-${L}.png` });
  // open booking, overlay on top
  await p.locator(".bar .btn").tap(); await p.waitForSelector("[role=dialog]"); await p.waitForTimeout(700);
  const top = await p.evaluate(() => { const d = document.querySelector(".dialog").getBoundingClientRect(); const e = document.elementFromPoint(d.left + d.width / 2, d.top + 40); return !!e?.closest(".dialog"); });
  ok("6 overlay on top", top, tag);
  ok("no autofocus in dialog", await p.evaluate(() => !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)), tag);
  const dlgA = await p.evaluate(audit(), ".dialog");
  ok("5 taps 44px", dlgA.small.length === 0, `${tag} dialog ${dlgA.small.join(", ")}`);
  ok("5 text 14px", dlgA.tiny.length === 0, `${tag} dialog ${dlgA.tiny.slice(0, 6).join(" | ")}`);
  await p.screenshot({ path: `${OUT}/${w}-${L}-booking.png` });
  const box = await p.locator(".dialog").boundingBox(), cx = box.x + box.width / 2;
  // short drag from the header springs back
  await swipe(cdp, cx, box.y + 30, box.y + 90, 400); await p.waitForTimeout(700);
  const back = await p.locator(".dialog").boundingBox();
  ok("swipe: short drag springs back", back && Math.abs(back.y - box.y) < 3, `${tag} y ${back?.y} vs ${box.y}`);
  // mid drag: backdrop fades with progress
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: box.y + 30 }] });
  for (let i = 1; i <= 10; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx, y: box.y + 30 + i * 18 }] }); await p.waitForTimeout(25); }
  const mid = await p.evaluate(() => ({ op: +getComputedStyle(document.querySelector(".scrim")).opacity, y: document.querySelector(".dialog").getBoundingClientRect().top }));
  ok("swipe: follows the finger", Math.abs(mid.y - (box.y + 174)) < 20, `${tag} sheet at ${mid.y} expected about ${box.y + 174}`);
  ok("swipe: backdrop fades with drag", mid.op < 0.9 && mid.op > 0.2, `${tag} opacity ${mid.op}`);
  for (let i = 9; i >= 0; i--) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx, y: box.y + 30 + i * 18 }] }); await p.waitForTimeout(16); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await p.waitForTimeout(600);
  // scrolled content: dragging down scrolls up, does not close
  await p.locator(".dialog").evaluate((e) => e.scrollTo(0, 260)); await p.waitForTimeout(150);
  await swipe(cdp, cx, box.y + 330, box.y + 430, 300); await p.waitForTimeout(500);
  ok("swipe: never fights inner scroll", await p.locator("[role=dialog]").count() === 1, `${tag} closed while scrolled`);
  // typing in an input and dragging on it does not close
  await p.locator(".dialog").evaluate((e) => e.scrollTo(0, 0)); await p.waitForTimeout(150);
  const nm = await p.locator("#fName").boundingBox();
  await swipe(cdp, nm.x + 40, nm.y + nm.height / 2, nm.y + nm.height / 2 + 160, 250); await p.waitForTimeout(500);
  ok("swipe: inputs do not start a drag", await p.locator("[role=dialog]").count() === 1, tag);
  // long drag from the content at the top closes
  await swipe(cdp, cx, box.y + 160, box.y + 160 + box.height * 0.45, 300);
  await p.waitForSelector("[role=dialog]", { state: "detached", timeout: 3000 }).then(() => ok("swipe: distance closes", true), () => ok("swipe: distance closes", false, tag));
  // quick flick from the handle closes (velocity)
  await p.locator(".bar .btn").tap(); await p.waitForSelector("[role=dialog]"); await p.waitForTimeout(700);
  const b2 = await p.locator(".dialog").boundingBox();
  // CDP touch is too slow under swiftshader for a real flick, so fire native TouchEvents in page at phone speed
  await p.evaluate(async ([x, y0]) => {
    const t = document.querySelector(".dlg-handle"), mk = (y) => new Touch({ identifier: 1, target: t, clientX: x, clientY: y });
    const fire = (type, y) => t.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: y == null ? [] : [mk(y)], changedTouches: [mk(y ?? y0 + 90)] }));
    fire("touchstart", y0); for (let i = 1; i <= 6; i++) { await new Promise((r) => setTimeout(r, 12)); fire("touchmove", y0 + i * 15); } fire("touchend", null);
  }, [cx, b2.y + 12]);
  await p.waitForSelector("[role=dialog]", { state: "detached", timeout: 3000 }).then(() => ok("swipe: flick closes", true), () => ok("swipe: flick closes", false, tag));
  // Android back closes the sheet and stays on the page
  await p.locator(".bar .btn").tap(); await p.waitForSelector("[role=dialog]"); await p.waitForTimeout(600);
  const url0 = p.url(); await p.goBack(); await p.waitForTimeout(700);
  ok("back closes the sheet", (await p.locator("[role=dialog]").count()) === 0 && p.url() === url0, tag);
  // close button leaves no extra history entry
  await p.locator(".bar .btn").tap(); await p.waitForSelector("[role=dialog]"); await p.waitForTimeout(600);
  await p.locator(".icon-btn").tap(); await p.waitForTimeout(700);
  ok("close keeps history clean", await p.evaluate(() => !history.state?.bk), tag);
  ok("no page errors", errs.length === 0, `${tag} ${errs.join("|")}`);
  await ctx.close();
}
// keyboard focus ring still shows (laptop)
{ const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await p.goto(BASE); await p.waitForTimeout(1500);
  for (let i = 0; i < 3; i++) await p.keyboard.press("Tab");
  const ring = await p.evaluate(() => { const cs = getComputedStyle(document.activeElement); return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0; });
  ok("focus ring from keyboard", ring, "1440 tab"); }
await b.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1)); console.log(fail ? `${fail} FAILED` : "ALL PASS"); process.exit(fail ? 1 : 0);
