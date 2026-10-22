import { chromium } from "playwright-core";
import fs from "fs";
const [BASE, OUT] = [process.argv[2] || "http://localhost:3311", process.argv[3] || "/workspace/qa/saafi/v3/local"];
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox","--enable-unsafe-swiftshader","--use-angle=swiftshader"] });
let fail = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };
const OPTIONAL = /optional|opcional|facultatif|اختياري|اختیاری|ज़रूरी नहीं/i;
for (const [w, h] of [[360, 780], [390, 844], [1280, 900], [1440, 900]]) for (const L of ["en", "ar", "ur", "hi"]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 800, isMobile: w < 800, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${BASE}/?lang=${L}`); await p.waitForSelector("canvas"); await p.waitForTimeout(2200);
  const tag = `${w} ${L}`;
  ok(await p.evaluate((L) => document.documentElement.lang === L && document.documentElement.dir === (L === "en" || L === "hi" ? "ltr" : "rtl"), L), `${tag} lang and dir`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag} no sideways scroll`);
  const h1 = await p.locator("h1").innerText(); ok(L === "en" ? /Price your/.test(h1) : L === "hi" ? /[\u0900-\u097F]/.test(h1) && !/[A-Za-z]/.test(h1) : /[\u0600-\u06FF]/.test(h1) && !/[A-Za-z]/.test(h1), `${tag} heading ${h1}`);
  ok(!(await p.evaluate(() => /Saafi|Noor/.test(document.body.innerText + document.title))), `${tag} no brand name`);
  ok(!OPTIONAL.test(await p.locator("body").innerText()), `${tag} no optional label`);
  if (w >= 800) {
    const desk = await p.evaluate(() => {
      const box = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, btm: b.bottom }; };
      const sheet = box(document.querySelector(".sheet"));
      const stage = box(document.querySelector(".stagecol"));
      const book = box(document.querySelector(".summary .book-btn"));
      const price = box(document.querySelector(".summary .price"));
      const h1 = box(document.querySelector("h1"));
      const canvas = box(document.querySelector("canvas"));
      const scroll = document.querySelector(".sheet-scroll");
      const doc = document.documentElement;
      const cs = getComputedStyle(document.querySelector(".sheet"));
      const ih = window.innerHeight, iw = window.innerWidth;
      return {
        canvas,
        sheetW: Math.round(sheet.w),
        pageOverflow: doc.scrollHeight > ih + 2 || doc.scrollWidth > iw + 2,
        sideBySide: sheet.r <= stage.x + 2 || stage.r <= sheet.x + 2,
        stageWider: stage.w > sheet.w + 40,
        sheetIn: sheet.y >= -1 && sheet.btm <= ih + 2 && sheet.x >= -1 && sheet.r <= iw + 2,
        stageIn: stage.y >= -1 && stage.btm <= ih + 2 && stage.x >= -1 && stage.r <= iw + 2,
        bookIn: book.w > 40 && book.h >= 48 && book.y >= 0 && book.btm <= ih + 1 && book.x >= 0 && book.r <= iw + 1,
        priceIn: price.w > 20 && price.y >= 0 && price.btm <= ih + 1,
        h1In: h1.y >= 0 && h1.btm <= ih && h1.h >= 28,
        canvasBig: canvas.w >= 480 && canvas.h >= 480,
        panelOk: sheet.w >= 420 && sheet.w <= 560,
        segH: document.querySelector(".seg").getBoundingClientRect().height,
        scrolls: scroll.scrollHeight > scroll.clientHeight + 20 && scroll.clientHeight > 400,
        hScroll: scroll.scrollWidth <= scroll.clientWidth + 1,
        phoneChrome: getComputedStyle(document.querySelector(".bar")).display === "none" && getComputedStyle(document.querySelector(".handle")).display === "none" && cs.position !== "fixed",
        radius: parseFloat(cs.borderRadius),
      };
    });
    ok(!desk.pageOverflow, `${tag} desktop page fits the viewport`);
    ok(desk.sideBySide && desk.stageWider, `${tag} house is the large side of a split`);
    ok(desk.sheetIn && desk.stageIn, `${tag} sheet and stage stay on screen`);
    ok(desk.bookIn && desk.priceIn && desk.h1In, `${tag} heading, price, and book stay on screen`);
    ok(desk.canvasBig, `${tag} house canvas is large (${Math.round(desk.canvas.w)}x${Math.round(desk.canvas.h)})`);
    ok(desk.panelOk, `${tag} sheet panel is a steady width (${desk.sheetW})`);
    ok(desk.segH >= 48 && desk.radius >= 20, `${tag} controls stay rounded and comfortable`);
    ok(desk.scrolls && desk.hScroll && desk.phoneChrome, `${tag} the sheet scrolls inside the panel`);
  }
  if (w < 800) {
    const r = await p.evaluate(() => ({ sheet: document.querySelector(".sheet").getBoundingClientRect().top / innerHeight, head: document.querySelector(".stage-head").getBoundingClientRect().bottom }));
    ok(r.sheet > 0.37 && r.sheet < 0.43, `${tag} sheet starts higher (${r.sheet.toFixed(2)})`);
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
  ok(await p.locator("#fMobile[aria-invalid=true]").count() === 1, `${tag} empty mobile is flagged`);
  ok(await p.locator("#fArea, .addr-toggle, #fBuilding, #fNotes").count() === 0, `${tag} no area or address fields`);
  ok(await p.locator("#shareLoc").count() === 1, `${tag} share location button`);
  ok(!OPTIONAL.test(await p.locator("#viewForm").innerText()) && !OPTIONAL.test(await p.locator("body").innerText()), `${tag} no optional label on the form or page`);
  ok(await p.locator("#fMobile").getAttribute("type") === "tel" && await p.locator("#fMobile").getAttribute("inputmode") === "numeric", `${tag} tel with numeric keypad`);
  ok(await p.locator("#fMobile").getAttribute("placeholder") === "050 000 0000", `${tag} gcc mobile placeholder`);
  const follows = await p.evaluate(() => {
    const name = document.getElementById("fName");
    const mobile = document.getElementById("fMobile");
    return !!(name && mobile && (name.compareDocumentPosition(mobile) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  ok(follows, `${tag} mobile follows name`);
  ok(await p.locator(".err.show").count() >= 2, `${tag} missing day and time are flagged`);
  // pick a date shows the next days as pills, nothing in the past
  await p.locator(".chip[data-day=pick]").click(); await p.waitForTimeout(450);
  const firstDay = await p.locator("#fDays .chip").first().getAttribute("data-date");
  ok(firstDay > new Date().toISOString().slice(0, 10), `${tag} date pills start after tomorrow (${firstDay})`);
  await p.locator(".chip[data-day=tomorrow]").click(); await p.waitForTimeout(200);
  const NAME = { en: "Omar Khalid", ar: "عمر خالد بن عبدالله الهاشمي من دبي مارينا", ur: "محمد عمر خالد", hi: "अरुण कुमार" }[L];
  await p.fill("#fName", NAME); await p.fill("#fMobile", "12");
  await p.locator("#sendBtn").click(); await p.waitForTimeout(200);
  ok(await p.locator("#fMobile[aria-invalid=true]").count() === 1, `${tag} short mobile is flagged`);
  await p.fill("#fMobile", "050 000 0000");
  await p.locator(".chips.times .chip:not([disabled])").nth(1).click();
  await p.screenshot({ path: `${OUT}/${w}-${L}-booking.png` });
  const hrefBefore = await p.locator("#sendBtn").getAttribute("href"); const [pop] = await Promise.all([ctx.waitForEvent("page"), p.locator("#sendBtn").click()]);
  const pop0 = hrefBefore; const url = decodeURIComponent(pop.url().replace(/\+/g, " ")) + " " + decodeURIComponent(pop0); await pop.close();
  ok(/971500000000/.test(url) && url.includes(NAME) && url.includes("050 000 0000") && !url.includes("maps.google.com") && !/Al Barsha/.test(url), `${tag} WhatsApp opens with mobile and without a location`);
  if (L === "hi") ok(/नई सफाई बुकिंग/.test(url) && /नाम: /.test(url), `${tag} WhatsApp message in Hindi`);
  if (w === 390) { const m = new URL(pop0).searchParams.get("text"); fs.writeFileSync(`${OUT}/message-${L}.txt`, m); }
  if (w === 1440) ok(/web\.whatsapp\.com|api\.whatsapp\.com|whatsapp\.com/.test(url), `${tag} desktop opens WhatsApp Web`);
  await p.locator("#viewDone").waitFor({ timeout: 4000 }).then(() => ok(true, `${tag} done view`), () => ok(false, `${tag} done view`));
  await p.locator("#copyBtn").click(); await p.waitForTimeout(200); ok(/Copied|تم النسخ|کاپی|कॉपी/.test(await p.locator("#copyBtn").innerText()), `${tag} copy details`);
  await p.keyboard.press("Escape"); await p.waitForSelector("[role=dialog]", { state: "detached", timeout: 4000 }).then(() => ok(true, `${tag} Escape closes`), () => ok(false, `${tag} Escape closes`));
  ok(errs.length === 0, `${tag} no page errors ${errs.join("|")}`);
  await ctx.close();
}
const MAP = "https://maps.google.com/?q=25.2048,55.2708";
for (const [w, h] of [[360, 780], [390, 844], [1280, 900], [1440, 900]]) for (const mode of ["ok", "deny"]) {
  const phone = w < 800;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: phone, isMobile: phone });
  const p = await ctx.newPage();
  await p.addInitScript((mode) => {
    const fake = {
      getCurrentPosition(success, error) {
        if (mode === "deny") { error({ code: 1, message: "denied" }); return; }
        success({ coords: { latitude: 25.2048, longitude: 55.2708, accuracy: 20 } });
      },
    };
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: fake });
  }, mode);
  const tag = `geo ${w} ${mode}`;
  await p.goto(`${BASE}/?lang=en`);
  await p.waitForSelector("canvas");
  await p.locator(phone ? ".bar .btn" : ".summary .book-btn").click();
  await p.waitForSelector("#shareLoc");
  ok(!OPTIONAL.test(await p.locator("body").innerText()), `${tag} no optional label`);
  await p.fill("#fName", "Omar Khalid");
  await p.fill("#fMobile", "050 000 0000");
  await p.locator("#shareLoc").click();
  if (mode === "ok") {
    await p.waitForSelector("[data-loc=added]");
    ok((await p.locator(".loc-added").innerText()).includes("Location added"), `${tag} location added`);
  } else {
    await p.waitForSelector("#locNote");
    ok((await p.locator("#locNote").innerText()).includes("You can still book"), `${tag} denied note`);
  }
  await p.locator(".chip[data-day=tomorrow]").click();
  await p.locator(".chips.times .chip:not([disabled])").first().click();
  const href = await p.locator("#sendBtn").getAttribute("href");
  const text = decodeURIComponent(href);
  ok(text.includes("050 000 0000"), `${tag} message includes mobile`);
  ok(text.includes(MAP) === (mode === "ok"), `${tag} maps link ${mode === "ok" ? "appended" : "omitted"}`);
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/c/saafi`);
  await p.waitForSelector("canvas");
  ok(!OPTIONAL.test(await p.locator("body").innerText()), "company page has no optional label");
  await p.locator(".bar .btn").click();
  await p.waitForSelector("#fMobile");
  ok(await p.locator("#fArea, .addr-toggle").count() === 0 && await p.locator("#shareLoc").count() === 1, "company page share location");
  ok(await p.locator("#fMobile").getAttribute("placeholder") === "050 000 0000", "company page mobile placeholder");
  await ctx.close();
}
await b.close(); console.log(fail ? `${fail} FAILED` : "ALL PASS"); process.exit(fail ? 1 : 0);
