/* Phone coverage for /us, /ca, and /uk at 360 and 390, every language those pages offer. */
import { chromium } from "playwright-core";
const [BASE] = [process.argv[2] || "http://127.0.0.1:3311"];
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
let fail = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };
const titles = { en: "Price your home cleaning", es: "Calcula el precio de la limpieza", fr: "Estimez le prix du ménage" };
const beds = { en: "Bedrooms", es: "Dormitorios", fr: "Chambres" };
const areas = { "/us": "10001", "/ca": "M5V 2T6", "/uk": "SW1A 1AA" };
const cases = [["/us", "en"], ["/us", "es"], ["/ca", "en"], ["/ca", "fr"], ["/ca", "es"], ["/uk", "en"]];

async function total(p) { return Number(await p.locator(".mkt").getAttribute("data-total")); }

for (const [w, h] of [[360, 780], [390, 844]]) for (const [path, L] of cases) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const tag = `${w} ${path} ${L}`;
  await p.goto(`${BASE}${path}?lang=${L}`);
  await p.waitForSelector(`[data-lang="${L}"]`);
  await p.waitForTimeout(200);
  const text = await p.locator(".mkt").innerText();
  ok(await p.locator("h1").innerText() === titles[L], `${tag} heading`);
  ok((await p.locator("#bedsLbl").innerText()).trim() === beds[L], `${tag} bedrooms label`);
  ok(!(/[—–-]/.test(text)), `${tag} no dashes in copy`);
  ok(!/Saafi|Darwin|Noor/i.test(text + await p.title()), `${tag} no brand`);
  if (path !== "/uk") ok(!/WhatsApp/i.test(text), `${tag} no WhatsApp`);
  ok(await p.evaluate(() => { const el = document.querySelector(".mkt"); return el.scrollWidth <= el.clientWidth + 1; }), `${tag} no sideways scroll`);
  const once = await total(p);
  await p.locator("[data-freq=weekly]").click();
  const weekly = await total(p);
  ok(Math.abs(weekly - Math.round(once * 0.8)) <= 1, `${tag} weekly 20% ${once} -> ${weekly}`);
  await p.locator("[data-freq=biweekly]").click();
  const bi = await total(p);
  ok(Math.abs(bi - (once - Math.round(once * 0.15))) <= 1, `${tag} every two weeks 15% ${bi}`);
  await p.locator("[data-freq=monthly]").click();
  const mo = await total(p);
  ok(Math.abs(mo - (once - Math.round(once * 0.1))) <= 1, `${tag} monthly 10% ${mo}`);
  await p.locator("[data-bed='3']").click();
  ok(await total(p) !== mo, `${tag} bedroom changes the price`);
  const before = await total(p);
  await p.locator("[data-extra=oven]").click();
  const price = Number(await p.locator("[data-extra=oven]").getAttribute("data-price"));
  ok((await total(p)) - before === Math.round(price * 100), `${tag} add on keeps its price`);
  await p.locator("#areaCode").fill(areas[path]);
  await p.locator("[data-day=tomorrow]").click();
  await p.locator("[data-window=a]").click();
  if (path === "/uk") await p.locator("#fName").fill(L === "en" ? "Ana Lopez" : "Ana");
  else { await p.locator("#fFirst").fill("Ana"); await p.locator("#fLast").fill("Lopez"); }
  await p.locator("#fEmail").fill("ana@example.com");
  await p.locator("#fPhone").fill("5550109999");
  await p.locator("#fTerms").check();
  await p.locator("#requestBtn").click();
  await p.waitForSelector("#doneTitle");
  ok((await p.locator("#doneTitle").innerText()).length > 0, `${tag} request received`);
  const tel = await p.locator("[data-contact=tel]").getAttribute("href");
  const sms = await p.locator("[data-contact=sms]").getAttribute("href");
  const mail = await p.locator("[data-contact=mailto]").getAttribute("href");
  ok(tel.includes("555") && sms.includes("555") && mail.includes("hello@example.com"), `${tag} placeholder call text email`);
  ok(!/9715|447700|212555|800555/.test(tel + sms + mail), `${tag} no lookalike real number`);
  const wa = await p.locator("[data-contact=whatsapp]").count();
  ok(path === "/uk" ? wa === 1 && (await p.locator("[data-contact=whatsapp]").getAttribute("href")).includes("wa.me/445550100") : wa === 0, `${tag} WhatsApp only in the UK`);
  const doneText = await p.locator(".mkt").innerText();
  ok(!/[—–-]/.test(doneText), `${tag} confirmation has no dashes`);
  ok(errs.length === 0, `${tag} no page errors ${errs.join("|")}`);
  await ctx.close();
}

{
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  await p.goto(`${BASE}/us?lang=en`);
  await p.waitForSelector("[data-market=us]");
  await p.locator("#areaCode").fill("99999");
  await p.waitForSelector("#areaMsg");
  ok(/do not cover/i.test(await p.locator("#areaMsg").innerText()), "US outside area");
  await p.locator("[data-currency=CAD]").click();
  await p.waitForSelector("[data-market=ca]");
  ok((await p.locator(".price").innerText()).startsWith("CAD"), "CAD toggle");
  ok(await p.locator("[data-lang-btn=fr]").count() === 1, "French appears with CAD");
  await p.locator("[data-service=move]").click();
  ok(await p.locator("[data-freq=weekly]").count() === 0, "move out has no recurring discount");
  await p.goto(`${BASE}/ca`);
  await p.waitForSelector("[data-market=ca]");
  await p.locator("#areaCode").fill("H2Y 1C6");
  await p.waitForSelector("[data-lang=fr]");
  ok((await p.locator("h1").innerText()).includes("Estimez"), "Quebec postal switches to French");
  await p.goto(`${BASE}/`);
  await p.waitForSelector("canvas");
  ok(await p.locator(".kind[data-kind=villa]").count() === 1, "GCC home still has villa");
  await p.goto(`${BASE}/c/saafi`);
  await p.waitForSelector("canvas");
  ok((await p.locator("h1").innerText()).includes("Price your"), "company page still the GCC estimator");
  await p.close();
}

await b.close();
console.log(fail ? `${fail} FAILED` : "ALL PASS");
process.exit(fail ? 1 : 0);
