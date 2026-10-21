import { chromium } from "playwright-core";
import fs from "fs";
const BASE = process.argv[2] || "http://localhost:3311", OUT = process.argv[3] || "/workspace/qa/saafi/v2/langs";
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
let fail = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };
for (const [w, h] of [[390, 844], [1440, 900]]) for (const L of ["en", "ur", "ar"]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 800 ? 2 : 1, hasTouch: w < 800, isMobile: w < 800 });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE); await p.waitForSelector("canvas"); await p.waitForTimeout(1500);
  if (L !== "en") await p.locator(`.langs button[lang=${L}]`).click();
  await p.waitForTimeout(1200);
  const dir = await p.evaluate(() => document.documentElement.dir);
  ok(dir === (L === "en" ? "ltr" : "rtl"), `${w} ${L} dir ${dir}`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${w} ${L} no sideways scroll`);
  const h1 = await p.locator("h1").innerText(); ok(L === "en" ? /Price/.test(h1) : /[\u0600-\u06FF]/.test(h1), `${w} ${L} heading translated: ${h1}`);
  const left = await p.evaluate(() => { const re = /\b(Bedrooms|Bathrooms|Floors|Cleaning type|See details|Book this cleaning|Add extras|Weekly)\b/; return [...document.querySelectorAll("button,span,label,legend,h1,h2,p,div.small")].filter((e) => e.children.length === 0 && e.offsetParent && re.test(e.textContent)).map((e) => e.textContent).slice(0, 5); });
  ok(L === "en" || left.length === 0, `${w} ${L} no English left ${left.join("|")}`);
  await p.screenshot({ path: `${OUT}/${w}-${L}.png` });
  const book = w < 1024 ? p.locator(".mobile-bar .cta") : p.locator(".summary .cta"); await book.click(); await p.waitForSelector("[role=dialog]"); await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/${w}-${L}-booking.png` });
  ok(errs.length === 0, `${w} ${L} no errors ${errs.join("|")}`);
  await ctx.close();
}
await b.close(); console.log(fail ? `${fail} FAILED` : "ALL PASS"); process.exit(fail ? 1 : 0);
