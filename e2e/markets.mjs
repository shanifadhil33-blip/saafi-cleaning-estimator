/* Phone coverage for the US, Canada, and UK sheets at 360 and 390. */
import fs from "fs";
import { chromium } from "playwright-core";
const [BASE] = [process.argv[2] || "http://127.0.0.1:3311"];
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
let fail = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };
const titles = { en: "Price your home cleaning", es: "Calcula el precio de la limpieza", fr: "Estimez le prix du ménage" };
const homes = { "/us": ["house", "apartment", "condo", "townhouse"], "/ca": ["house", "apartment", "condo", "townhouse"], "/uk": ["flat", "terraced", "semi", "detached"] };
const mobiles = { "/us": "(555) 010 0199", "/ca": "(555) 010 0199", "/uk": "07700 900123" };
const placeholders = { "/us": "(555) 010 0100", "/ca": "(555) 010 0100", "/uk": "07700 900000" };
const cases = [["/us", "en"], ["/us", "es"], ["/ca", "en"], ["/ca", "fr"], ["/uk", "en"]];
const widths = [[360, 780], [390, 844], [1280, 900], [1440, 900]];
const bodyOf = (href, key) => decodeURIComponent((href.split(`${key}=`)[1] || "").replace(/\+/g, " "));
const OPTIONAL = /optional|opcional|facultatif|اختياري|اختیاری|ज़रूरी नहीं/i;

async function total(p) { return Number(await p.locator(".app").getAttribute("data-total")); }

for (const [w, h] of widths) for (const [path, L] of cases) {
  const phone = w <= 820;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: phone, isMobile: phone, deviceScaleFactor: phone ? 2 : 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const tag = `${w} ${path} ${L}`;
  await p.goto(`${BASE}${path}?lang=${L}`);
  await p.waitForSelector("canvas");
  await p.waitForSelector(`.app[data-lang="${L}"]`, { state: "attached" });
  if (phone) await p.waitForFunction(() => { const s = document.querySelector(".sheet"); return s && s.getBoundingClientRect().top < innerHeight * 0.55; });
  else await p.waitForSelector(".summary .book-btn");
  const text = await p.evaluate(() => document.body.innerText);
  ok((await p.locator("h1").innerText()) === titles[L], `${tag} heading`);
  ok(await p.locator(".handle").count() === 1 && await p.locator(".bar").count() === 1, `${tag} sheet and booking bar`);
  ok(await p.locator(".mkt").count() === 0, `${tag} no separate form page`);
  const kinds = await p.locator(".kind").evaluateAll((els) => els.map((el) => el.getAttribute("data-kind")));
  ok(kinds.join() === homes[path].join(), `${tag} home types ${kinds.join(" ")}`);
  ok(await p.locator(".kind[data-kind=villa]").count() === 0, `${tag} no GCC villa chip`);
  if (path === "/us" || path === "/ca") {
    const chip = await p.locator(".kind[aria-checked=true]").evaluate((el) => {
      const row = el.parentElement.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { kind: el.getAttribute("data-kind"), in: r.width > 0 && r.left >= row.left - 1 && r.right <= row.right + 1 };
    });
    ok(chip.kind === "house" && chip.in, `${tag} House is the default and in view`);
  }
  if (path === "/ca") {
    const labels = await p.locator(".lang button").evaluateAll((els) => [...new Set(els.map((el) => el.textContent.trim()))]);
    ok(labels.join(",") === "EN,FR", `${tag} English and French only (${labels.join(",")})`);
  }
  ok(await p.locator("#sqftRange").count() === 1 && await p.locator("#floorsSeg").count() === 1 && await p.locator("#bedsLbl").count() === 1, `${tag} size slider, floors, bedrooms`);
  const sub = await p.locator("#homeSub").evaluate((el) => el.textContent.replace(/\s+/g, " "));
  if (path === "/uk") ok(/sq ft|pi²/.test(sub), `${tag} size caption`);
  if (L === "en") ok(/\dBR/.test(sub) && /bath/.test(sub), `${tag} bedroom and bathroom labels`);
  if (L === "es") ok(/dorm/.test(sub) && /baño/.test(sub), `${tag} bedroom and bathroom labels`);
  if (L === "fr") ok(/\d ch\b/.test(sub) && /sdb/.test(sub) && /2 200/.test(sub), `${tag} bedroom and bathroom labels`);
  const captionClear = await p.evaluate(() => {
    const sub = document.querySelector("#homeSub");
    const sheet = document.querySelector("#sheet");
    if (!sub || !sheet) return false;
    const line = parseFloat(getComputedStyle(sub).lineHeight) || 16;
    const box = sub.getBoundingClientRect();
    return box.height / line <= 2.2 && box.bottom <= sheet.getBoundingClientRect().top - 8;
  });
  if (phone) ok(captionClear, `${tag} caption fits above the sheet`);
  ok(await p.locator(".extra.maid").count() === 0, `${tag} no maid room`);
  const inset = await p.locator("#freqSeg button").evaluateAll((els) => els.length === 4 && els.every((el) => {
    const r = el.getBoundingClientRect();
    return el.scrollWidth <= el.clientWidth + 1 && r.left >= 16 && r.right <= window.innerWidth - 16;
  }));
  ok(inset, `${tag} frequency stays inside the side padding`);
  const beforeSlide = await total(p);
  await p.locator("#sqftRange").evaluate((el) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(el, el.max);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  ok((await total(p)) !== beforeSlide, `${tag} slider changes the price`);
  ok(!(/[—–-]/.test(text)), `${tag} no dashes in copy`);
  ok(!OPTIONAL.test(text), `${tag} no optional label`);
  ok(!/Saafi|Darwin|Noor/i.test(text + await p.title()), `${tag} no brand`);
  if (path !== "/uk") ok(!/WhatsApp/i.test(text), `${tag} no WhatsApp`);
  else ok(/WhatsApp/.test(text), `${tag} WhatsApp offered`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag} no sideways scroll`);
  if (phone) {
    const ratio = await p.evaluate(() => document.querySelector(".sheet").getBoundingClientRect().top / innerHeight);
    ok(ratio > 0.35 && ratio < 0.5, `${tag} sheet sits over the house (${ratio.toFixed(2)})`);
  }
  const once = await total(p);
  await p.locator("[data-freq=weekly]").click();
  const weekly = await total(p);
  ok(Math.abs(weekly - Math.round(once * 0.8)) <= 1, `${tag} weekly 20% ${once} -> ${weekly}`);
  await p.locator("[data-freq=biweekly]").click();
  ok(Math.abs((await total(p)) - (once - Math.round(once * 0.15))) <= 1, `${tag} every two weeks 15%`);
  await p.locator("[data-freq=monthly]").click();
  const mo = await total(p);
  ok(Math.abs(mo - (once - Math.round(once * 0.1))) <= 1, `${tag} monthly 10%`);
  await p.locator("[aria-labelledby='bedsLbl'] button").last().click();
  ok((await total(p)) !== mo, `${tag} size changes the price`);
  const before = await total(p);
  await p.locator(".row-toggle").click();
  await p.locator("[data-k=oven]").click();
  ok((await total(p)) > before, `${tag} add on raises the price`);
  await p.locator("[data-v=move], [data-v=oneoff]").first().click();
  ok(await p.locator("[data-freq=weekly]").isDisabled(), `${tag} one off clean has no recurring discount`);
  await p.locator(phone ? ".bar .btn" : ".summary .book-btn").click();
  await p.waitForSelector("[role=dialog]");
  await p.locator("#sendBtn").click();
  ok(await p.locator("#fName[aria-invalid=true]").count() === 1, `${tag} name is required`);
  ok(await p.locator("#fMobile[aria-invalid=true]").count() === 1, `${tag} mobile is required`);
  ok(await p.locator("#fArea, .addr-toggle").count() === 0, `${tag} no postal code or street address`);
  ok(await p.locator("#shareLoc").count() === 1, `${tag} share location button`);
  const formText = await p.locator("#viewForm").innerText();
  ok(!OPTIONAL.test(formText) && !OPTIONAL.test(await p.locator("body").innerText()), `${tag} no optional label on the form or page`);
  ok(await p.locator("#fMobile").getAttribute("type") === "tel" && await p.locator("#fMobile").getAttribute("inputmode") === "numeric", `${tag} tel with numeric keypad`);
  ok(await p.locator("#fMobile").getAttribute("placeholder") === placeholders[path], `${tag} mobile placeholder`);
  const follows = await p.evaluate(() => {
    const name = document.getElementById("fName");
    const mobile = document.getElementById("fMobile");
    return !!(name && mobile && (name.compareDocumentPosition(mobile) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  ok(follows, `${tag} mobile follows name`);
  ok(!/[—–-]/.test(await p.locator("#viewForm").innerText()), `${tag} form copy has no dashes`);
  await p.locator("#fName").fill("Ana Lopez");
  await p.locator("#fMobile").fill("12");
  await p.locator("#sendBtn").click();
  ok(await p.locator("#fMobile[aria-invalid=true]").count() === 1 && (await p.locator("#mobileErr").innerText()).length > 3, `${tag} short mobile is flagged`);
  await p.locator("#fMobile").fill(mobiles[path]);
  await p.locator("[data-day=tomorrow]").click();
  await p.locator(".chips.times .chip:not([disabled])").first().click();
  await p.locator("#sendBtn").evaluate((el) => el.addEventListener("click", (e) => e.preventDefault(), true));
  var sendHref = await p.locator("#sendBtn").getAttribute("href");
  await p.locator("#sendBtn").click();
  await p.waitForSelector("#viewDone");
  const drawn = await p.waitForFunction(() => {
    const el = document.querySelector(".done-mark path");
    return !!el && parseFloat(getComputedStyle(el).strokeDashoffset) < 1;
  }, null, { timeout: 3000 }).then(() => true).catch(() => false);
  const dash = await p.locator(".done-mark path").evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset));
  ok(drawn && dash < 1, `${tag} confirmation tick is drawn (${dash})`);
  const send = sendHref;
  const mail = await p.locator("[data-contact=email]").getAttribute("href");
  ok(mail.includes("hello@example.com"), `${tag} email alternative`);
  const sendBody = bodyOf(send, path === "/uk" ? "text" : "body");
  const mailBody = bodyOf(mail, "body");
  ok(sendBody.includes(mobiles[path]) && !sendBody.includes("maps.google.com"), `${tag} primary includes mobile and works without location`);
  ok(mailBody.includes(mobiles[path]) && !mailBody.includes("maps.google.com"), `${tag} email includes mobile and works without location`);
  if (path === "/uk") {
    ok(send.startsWith("https://wa.me/445550100?text="), `${tag} Book sends WhatsApp`);
    const sms = await p.locator("[data-contact=sms]").getAttribute("href");
    ok(sms.startsWith("sms:+445550100?body=") && (await p.locator("[data-contact=whatsapp]").count()) === 0, `${tag} text alternative, no second WhatsApp`);
  } else {
    ok(send.startsWith("sms:+15550100?body="), `${tag} Book sends a text`);
    ok((await p.locator("[data-contact=sms]").count()) === 0 && !/WhatsApp/i.test(await p.locator("#viewDone").innerText()), `${tag} no WhatsApp alternative`);
  }
  ok(!/saafi/i.test(await p.evaluate(() => document.title + "\n" + document.body.innerText + "\n" + [...document.querySelectorAll("meta")].map((m) => m.content || "").join("\n"))), `${tag} no brand in the page`);
  ok(!/[—–-]/.test(await p.locator("#viewDone").innerText()), `${tag} confirmation has no dashes`);
  ok(errs.length === 0, `${tag} no page errors ${errs.join("|")}`);
  await ctx.close();
}

{
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  await p.goto(`${BASE}/ca?lang=fr`);
  await p.waitForSelector("canvas");
  await p.locator(".bar .btn").click();
  await p.waitForSelector("#shareLoc");
  ok((await p.locator("#shareLoc").innerText()).includes("Partager ma position"), "French share location copy");
  ok(!OPTIONAL.test(await p.locator("body").innerText()), "French page has no optional label");
  ok(await p.locator("#fArea").count() === 0, "Canada booking has no postal field");
  await p.goto(`${BASE}/`);
  await p.waitForSelector("canvas");
  ok(await p.locator(".kind[data-kind=villa]").count() === 1, "GCC home still has villa");
  ok(/WhatsApp/i.test(await p.locator(".lead").innerText()), "GCC home still books on WhatsApp");
  ok(!OPTIONAL.test(await p.locator("body").innerText()), "GCC home has no optional label");
  await p.goto(`${BASE}/c/saafi`);
  await p.waitForSelector("canvas");
  ok((await p.locator("h1").innerText()).includes("Price your"), "company page still the GCC estimator");
  ok(!OPTIONAL.test(await p.locator("body").innerText()), "company page has no optional label");
  await p.locator(".bar .btn").click();
  await p.waitForSelector("#fMobile");
  ok(await p.locator("#fArea, .addr-toggle").count() === 0 && await p.locator("#shareLoc").count() === 1, "company booking uses location instead of area");
  ok(await p.locator("#fMobile").getAttribute("placeholder") === "050 000 0000", "company mobile placeholder");
  await p.close();
}

const shots = "/opt/cursor/artifacts";
fs.mkdirSync(shots, { recursive: true });
const pages = [["/", "home"], ["/us", "us"], ["/ca", "ca"], ["/uk", "uk"], ["/c/saafi", "saafi"]];
for (const [w, h] of [[1280, 800], [1440, 900], [1920, 1080]]) for (const [path, name] of pages) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const tag = `${w}x${h} ${path}`;
  await p.goto(`${BASE}${path}`);
  await p.waitForSelector("canvas");
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => {
    const sheet = document.querySelector(".sheet");
    const stage = document.querySelector(".stagecol");
    if (!sheet || !stage) return false;
    const s = sheet.getBoundingClientRect();
    const t = stage.getBoundingClientRect();
    return s.width > 300 && t.width > s.width && s.height > 400;
  });
  await p.waitForTimeout(1600);
  const desk = await p.evaluate(() => {
    const box = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, btm: b.bottom }; };
    const sheet = box(document.querySelector(".sheet"));
    const stage = box(document.querySelector(".stagecol"));
    const book = box(document.querySelector(".summary .book-btn"));
    const price = box(document.querySelector(".summary .price"));
    const h1 = box(document.querySelector("h1"));
    const canvas = box(document.querySelector("canvas"));
    const kind = box(document.querySelector(".kind"));
    const scroll = document.querySelector(".sheet-scroll");
    const doc = document.documentElement;
    const cs = getComputedStyle(document.querySelector(".sheet"));
    const ih = window.innerHeight, iw = window.innerWidth;
    return {
      canvas, sheetW: Math.round(sheet.w),
      pageOverflow: doc.scrollHeight > ih + 2 || doc.scrollWidth > iw + 2,
      sideBySide: sheet.r <= stage.x + 2 || stage.r <= sheet.x + 2,
      stageWider: stage.w > sheet.w + 40,
      sheetIn: sheet.y >= -1 && sheet.btm <= ih + 2 && sheet.x >= -1 && sheet.r <= iw + 2,
      stageIn: stage.y >= -1 && stage.btm <= ih + 2 && stage.x >= -1 && stage.r <= iw + 2,
      bookIn: book.w > 40 && book.h >= 48 && book.y >= 0 && book.btm <= ih + 1 && book.x >= 0 && book.r <= iw + 1,
      priceIn: price.w > 20 && price.y >= 0 && price.btm <= ih + 1,
      h1In: h1.y >= 0 && h1.btm <= ih && h1.h >= 28,
      kindIn: kind.y >= sheet.y && kind.btm <= sheet.btm,
      canvasBig: canvas.w >= 480 && canvas.h >= 480,
      panelOk: sheet.w >= 420 && sheet.w <= 560,
      segH: document.querySelector(".seg").getBoundingClientRect().height,
      scrolls: scroll.scrollHeight > scroll.clientHeight + 20 && scroll.clientHeight > 400,
      hScroll: scroll.scrollWidth <= scroll.clientWidth + 1,
      phoneChrome: getComputedStyle(document.querySelector(".bar")).display === "none" && getComputedStyle(document.querySelector(".handle")).display === "none" && cs.position !== "fixed",
      radius: parseFloat(cs.borderRadius),
      mono: getComputedStyle(document.body).backgroundColor === "rgb(13, 13, 13)",
    };
  });
  ok(!desk.pageOverflow, `${tag} page fits the viewport`);
  ok(desk.sideBySide && desk.stageWider, `${tag} house is the large side of a split`);
  ok(desk.sheetIn && desk.stageIn, `${tag} sheet and stage stay on screen`);
  ok(desk.bookIn && desk.priceIn && desk.h1In && desk.kindIn, `${tag} heading, price, book, and home type stay on screen`);
  ok(desk.canvasBig, `${tag} house canvas is large (${Math.round(desk.canvas.w)}x${Math.round(desk.canvas.h)})`);
  ok(desk.panelOk, `${tag} sheet panel is a steady width (${desk.sheetW})`);
  ok(desk.segH >= 48 && desk.radius >= 20, `${tag} controls stay rounded and comfortable`);
  ok(desk.scrolls && desk.hScroll && desk.phoneChrome && desk.mono, `${tag} the sheet scrolls inside a dark panel`);
  if (path !== "/" && path !== "/c/saafi") ok(!/Saafi|Darwin|Noor/i.test(await p.evaluate(() => document.title + "\n" + document.body.innerText)), `${tag} no brand`);
  ok(!OPTIONAL.test(await p.locator("body").innerText()), `${tag} no optional label`);
  await p.screenshot({ path: `${shots}/desktop-${w}x${h}-${name}.png` });
  ok(errs.length === 0, `${tag} no page errors ${errs.join("|")}`);
  await ctx.close();
}

const MAP = "https://maps.google.com/?q=40.7128,-74.006";
const geoCases = [
  { w: 360, h: 780, path: "/us", lang: "en", mode: "ok", share: "Share my location", added: "Location added", note: "" },
  { w: 390, h: 844, path: "/us", lang: "es", mode: "ok", share: "Compartir mi ubicación", added: "Ubicación añadida", note: "" },
  { w: 1280, h: 900, path: "/ca", lang: "fr", mode: "ok", share: "Partager ma position", added: "Position ajoutée", note: "" },
  { w: 1440, h: 900, path: "/uk", lang: "en", mode: "ok", share: "Share my location", added: "Location added", note: "" },
  { w: 360, h: 780, path: "/ca", lang: "en", mode: "deny", share: "Share my location", added: "", note: "You can still book" },
  { w: 390, h: 844, path: "/us", lang: "es", mode: "deny", share: "Compartir mi ubicación", added: "", note: "Puedes reservar igual" },
  { w: 1280, h: 900, path: "/uk", lang: "en", mode: "deny", share: "Share my location", added: "", note: "You can still book" },
  { w: 1440, h: 900, path: "/ca", lang: "fr", mode: "deny", share: "Partager ma position", added: "", note: "réserver quand même" },
];
for (const geo of geoCases) {
  const phone = geo.w <= 820;
  const ctx = await b.newContext({ viewport: { width: geo.w, height: geo.h }, hasTouch: phone, isMobile: phone });
  const p = await ctx.newPage();
  await p.addInitScript((mode) => {
    const fake = {
      getCurrentPosition(success, error) {
        if (mode === "deny") { error({ code: 1, message: "denied" }); return; }
        success({ coords: { latitude: 40.7128, longitude: -74.006, accuracy: 12 } });
      },
    };
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: fake });
  }, geo.mode);
  const tag = `geo ${geo.w} ${geo.path} ${geo.lang} ${geo.mode}`;
  await p.goto(`${BASE}${geo.path}?lang=${geo.lang}`);
  await p.waitForSelector("canvas");
  await p.locator(phone ? ".bar .btn" : ".summary .book-btn").click();
  await p.waitForSelector("#shareLoc");
  ok((await p.locator("#shareLoc").innerText()).includes(geo.share), `${tag} button copy`);
  ok(!OPTIONAL.test(await p.locator("body").innerText()), `${tag} no optional label`);
  const mobile = mobiles[geo.path];
  await p.locator("#fName").fill("Ana Lopez");
  await p.locator("#fMobile").fill(mobile);
  await p.locator("#shareLoc").click();
  if (geo.mode === "ok") {
    await p.waitForSelector("[data-loc=added]");
    ok((await p.locator(".loc-added").innerText()).includes(geo.added), `${tag} location added`);
    ok(await p.locator("#locRemove").count() === 1, `${tag} remove control`);
    if (geo.w === 360) {
      await p.locator("#locRemove").click();
      await p.waitForSelector("#shareLoc");
      ok(await p.locator("[data-loc=added]").count() === 0, `${tag} remove clears location`);
      await p.locator("#shareLoc").click();
      await p.waitForSelector("[data-loc=added]");
    }
  } else {
    await p.waitForSelector("#locNote");
    const note = await p.locator("#locNote").innerText();
    ok(note.includes(geo.note) && await p.locator("#shareLoc").count() === 1, `${tag} denied note stays on the form (${note})`);
    ok(!/[—–-]/.test(note), `${tag} denied note has no dashes`);
  }
  ok(!OPTIONAL.test(await p.locator("#viewForm").innerText()) && !OPTIONAL.test(await p.locator("body").innerText()), `${tag} form never says optional`);
  await p.locator("[data-day=tomorrow]").click();
  await p.locator(".chips.times .chip:not([disabled])").first().click();
  await p.locator("#sendBtn").evaluate((el) => el.addEventListener("click", (e) => e.preventDefault(), true));
  const primaryHref = await p.locator("#sendBtn").getAttribute("href");
  await p.locator("#sendBtn").click();
  await p.waitForSelector("#viewDone");
  const primaryBody = bodyOf(primaryHref, geo.path === "/uk" ? "text" : "body");
  const mailBody = bodyOf(await p.locator("[data-contact=email]").getAttribute("href"), "body");
  ok(primaryBody.includes(mobile) && mailBody.includes(mobile), `${tag} messages include mobile`);
  const expectLink = geo.mode === "ok";
  ok(primaryBody.includes(MAP) === expectLink && mailBody.includes(MAP) === expectLink, `${tag} maps link ${expectLink ? "appended" : "omitted"}`);
  if (geo.path === "/uk") {
    const smsBody = bodyOf(await p.locator("[data-contact=sms]").getAttribute("href"), "body");
    ok(smsBody.includes(MAP) === expectLink && smsBody.includes(mobile), `${tag} text maps link`);
  }
  await ctx.close();
}

await b.close();
console.log(fail ? `${fail} FAILED` : "ALL PASS");
process.exit(fail ? 1 : 0);
