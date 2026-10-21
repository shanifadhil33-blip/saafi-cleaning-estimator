import { chromium } from "playwright-core";
import fs from "fs";
const [BASE, OUT] = [process.argv[2] || "http://localhost:3311", process.argv[3] || "/workspace/qa/saafi/v3/local"];
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox","--enable-unsafe-swiftshader","--use-angle=swiftshader"] });
let fail = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };
for (const [w, h] of [[360, 780], [390, 844], [1440, 900]]) for (const L of ["en", "ar", "ur"]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 800, isMobile: w < 800 });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${BASE}/?lang=${L}`); await p.waitForSelector("canvas"); await p.waitForTimeout(2200);
  const tag = `${w} ${L}`;
  ok(await p.evaluate((L) => document.documentElement.lang === L && document.documentElement.dir === (L === "en" ? "ltr" : "rtl"), L), `${tag} lang and dir`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag} no sideways scroll`);
  const h1 = await p.locator("h1").innerText(); ok(L === "en" ? /Price your/.test(h1) : /[\u0600-\u06FF]/.test(h1) && !/[A-Za-z]/.test(h1), `${tag} heading ${h1}`);
  ok(!(await p.evaluate(() => /Saafi|Noor/.test(document.body.innerText + document.title))), `${tag} no brand name`);
  if (w < 800) {
    const r = await p.evaluate(() => ({ sheet: document.querySelector(".sheet").getBoundingClientRect().top / innerHeight, head: document.querySelector(".stage-head").getBoundingClientRect().bottom }));
    ok(r.sheet > 0.45 && r.sheet < 0.56, `${tag} sheet starts at half (${r.sheet.toFixed(2)})`);
    const small = await p.evaluate(() => [...document.querySelectorAll(".sheet button, .bar button")].filter((e) => { const r = e.getBoundingClientRect(); return e.offsetParent && r.top < innerHeight && r.bottom > 0 && r.height < 40 && !e.closest(".unit") && !e.closest(".link-btn") && !e.classList.contains("handle"); }).length);
    ok(small === 0, `${tag} visible tap targets 40px or more (${small} small)`);
  }
  await p.screenshot({ path: `${OUT}/${w}-${L}.png` });
  // change inputs: villa, more beds, maid
  await p.locator(".kind[data-kind=villa]").click(); await p.waitForTimeout(300);
  const before = await p.locator(w < 800 ? ".bar .price" : ".summary .price").innerText();
  await p.locator(".extra.maid").click(); await p.waitForTimeout(900);
  const after = await p.locator(w < 800 ? ".bar .price" : ".summary .price").innerText();
  ok(before !== after, `${tag} maid's room changes price ${before} -> ${after}`);
  // booking
  await p.locator(w < 800 ? ".bar .btn" : ".summary .book-btn").click();
  await p.waitForSelector("[role=dialog]"); await p.waitForTimeout(600);
  await p.locator("#sendBtn").click(); await p.waitForTimeout(300);
  ok(await p.locator("#fName[aria-invalid=true]").count() === 1, `${tag} empty name is flagged`);
  await p.fill("#fName", "Omar Khalid"); await p.fill("#fArea", "Al Barsha"); await p.locator(".chip").first().click();
  await p.screenshot({ path: `${OUT}/${w}-${L}-booking.png` });
  const [pop] = await Promise.all([ctx.waitForEvent("page"), p.locator("#sendBtn").click()]);
  const url = decodeURIComponent(pop.url().replace(/\+/g, " ")); await pop.close();
  ok(/971500000000/.test(url) && /Omar Khalid/.test(url) && /Al Barsha/.test(url), `${tag} WhatsApp opens with the booking`);
  await p.locator("#viewDone").waitFor({ timeout: 4000 }).then(() => ok(true, `${tag} done view`), () => ok(false, `${tag} done view`));
  await p.keyboard.press("Escape"); await p.waitForSelector("[role=dialog]", { state: "detached", timeout: 4000 }).then(() => ok(true, `${tag} Escape closes`), () => ok(false, `${tag} Escape closes`));
  ok(errs.length === 0, `${tag} no page errors ${errs.join("|")}`);
  await ctx.close();
}
await b.close(); console.log(fail ? `${fail} FAILED` : "ALL PASS"); process.exit(fail ? 1 : 0);
