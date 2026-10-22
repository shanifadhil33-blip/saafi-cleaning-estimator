/* Phone coverage for the US, Canada, and UK sheets at 360 and 390. */
import { chromium } from "playwright-core";
const [BASE] = [process.argv[2] || "http://127.0.0.1:3311"];
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
let fail = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };
const titles = { en: "Price your home cleaning", es: "Calcula el precio de la limpieza", fr: "Estimez le prix du ménage" };
const homes = { "/us": ["house", "condo", "townhouse", "apartment"], "/ca": ["house", "condo", "townhouse", "apartment"], "/uk": ["flat", "terraced", "semi", "detached"] };
const areas = { "/us": "10001", "/ca": "M5V 2T6", "/uk": "SW1A 1AA" };
const cases = [["/us", "en"], ["/us", "es"], ["/ca", "en"], ["/ca", "fr"], ["/uk", "en"]];

async function total(p) { return Number(await p.locator(".app").getAttribute("data-total")); }

for (const [w, h] of [[360, 780], [390, 844]]) for (const [path, L] of cases) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const tag = `${w} ${path} ${L}`;
  await p.goto(`${BASE}${path}?lang=${L}`);
  await p.waitForSelector("canvas");
  await p.waitForSelector(`.app[data-lang="${L}"]`, { state: "attached" });
  await p.waitForFunction(() => { const s = document.querySelector(".sheet"); return s && s.getBoundingClientRect().top < innerHeight * 0.55; });
  const text = await p.evaluate(() => document.body.innerText);
  ok((await p.locator("h1").innerText()) === titles[L], `${tag} heading`);
  ok(await p.locator(".handle").count() === 1 && await p.locator(".bar").count() === 1, `${tag} sheet and booking bar`);
  ok(await p.locator(".mkt").count() === 0, `${tag} no separate form page`);
  const kinds = await p.locator(".kind").evaluateAll((els) => els.map((el) => el.getAttribute("data-kind")));
  ok(kinds.join() === homes[path].join(), `${tag} home types ${kinds.join(" ")}`);
  ok(await p.locator(".kind[data-kind=villa]").count() === 0, `${tag} no GCC villa chip`);
  ok(!(/[—–-]/.test(text)), `${tag} no dashes in copy`);
  ok(!/Saafi|Darwin|Noor/i.test(text + await p.title()), `${tag} no brand`);
  if (path !== "/uk") ok(!/WhatsApp/i.test(text), `${tag} no WhatsApp`);
  else ok(/WhatsApp/.test(text), `${tag} WhatsApp offered`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag} no sideways scroll`);
  const ratio = await p.evaluate(() => document.querySelector(".sheet").getBoundingClientRect().top / innerHeight);
  ok(ratio > 0.35 && ratio < 0.5, `${tag} sheet sits over the house (${ratio.toFixed(2)})`);
  const once = await total(p);
  await p.locator("[data-freq=weekly]").click();
  const weekly = await total(p);
  ok(Math.abs(weekly - Math.round(once * 0.8)) <= 1, `${tag} weekly 20% ${once} -> ${weekly}`);
  await p.locator("[data-freq=biweekly]").click();
  ok(Math.abs((await total(p)) - (once - Math.round(once * 0.15))) <= 1, `${tag} every two weeks 15%`);
  await p.locator("[data-freq=monthly]").click();
  const mo = await total(p);
  ok(Math.abs(mo - (once - Math.round(once * 0.1))) <= 1, `${tag} monthly 10%`);
  const sizeBtn = path === "/uk" ? "[aria-labelledby='hoursLbl'] button" : "[aria-labelledby='bedsLbl'] button";
  await p.locator(sizeBtn).last().click();
  ok((await total(p)) !== mo, `${tag} size changes the price`);
  const before = await total(p);
  await p.locator(".row-toggle").click();
  await p.locator("[data-k=oven]").click();
  ok((await total(p)) > before, `${tag} add on raises the price`);
  await p.locator("[data-v=move], [data-v=oneoff]").first().click();
  ok(await p.locator("[data-freq=weekly]").count() === 0, `${tag} one off clean has no recurring discount`);
  await p.locator(".bar .btn").click();
  await p.waitForSelector("[role=dialog]");
  await p.locator("#sendBtn").click();
  ok(await p.locator("#fName[aria-invalid=true]").count() === 1, `${tag} name is required`);
  await p.locator("#fName").fill("Ana Lopez");
  await p.locator("#fArea").fill(areas[path]);
  await p.locator("[data-day=tomorrow]").click();
  await p.locator(".chips.times .chip:not([disabled])").first().click();
  await p.locator("#sendBtn").click();
  await p.waitForSelector("#viewDone");
  const drawn = await p.waitForFunction(() => {
    const el = document.querySelector(".done-mark path");
    return !!el && parseFloat(getComputedStyle(el).strokeDashoffset) < 1;
  }, null, { timeout: 3000 }).then(() => true).catch(() => false);
  const dash = await p.locator(".done-mark path").evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset));
  ok(drawn && dash < 1, `${tag} confirmation tick is drawn (${dash})`);
  const tel = await p.locator("[data-contact=tel]").getAttribute("href");
  const sms = await p.locator("[data-contact=sms]").getAttribute("href");
  const mail = await p.locator("[data-contact=mailto]").getAttribute("href");
  ok(tel.includes("555") && sms.includes("555") && mail.includes("hello@example.com"), `${tag} placeholder call text email`);
  const wa = await p.locator("[data-contact=whatsapp]").count();
  ok(path === "/uk" ? wa === 1 && (await p.locator("[data-contact=whatsapp]").getAttribute("href")).includes("wa.me/445550100") : wa === 0, `${tag} WhatsApp only in the UK`);
  ok(!/[—–-]/.test(await p.locator("#viewDone").innerText()), `${tag} confirmation has no dashes`);
  ok(errs.length === 0, `${tag} no page errors ${errs.join("|")}`);
  await ctx.close();
}

{
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  await p.goto(`${BASE}/ca`);
  await p.waitForSelector("canvas");
  await p.locator(".bar .btn").click();
  await p.waitForSelector("#fArea");
  await p.locator("#fArea").fill("H2Y 1C6");
  await p.waitForFunction(() => document.documentElement.lang === "fr");
  ok((await p.locator("h1").innerText()).includes("Estimez"), "Quebec postal switches to French");
  await p.goto(`${BASE}/`);
  await p.waitForSelector("canvas");
  ok(await p.locator(".kind[data-kind=villa]").count() === 1, "GCC home still has villa");
  ok(/WhatsApp/i.test(await p.locator(".lead").innerText()), "GCC home still books on WhatsApp");
  await p.goto(`${BASE}/c/saafi`);
  await p.waitForSelector("canvas");
  ok((await p.locator("h1").innerText()).includes("Price your"), "company page still the GCC estimator");
  await p.close();
}

await b.close();
console.log(fail ? `${fail} FAILED` : "ALL PASS");
process.exit(fail ? 1 : 0);
