import { chromium } from "playwright-core";
import fs from "fs";
const BASE = process.argv[2] || "http://localhost:3311", OUT = process.argv[3] || "/workspace/qa/saafi/v2/fixlocal";
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox","--enable-unsafe-swiftshader","--use-angle=swiftshader"] });
let fail = 0; const ok = (c, m) => { if (!c) { console.log("FAIL " + m); fail++; } };
const sizes = (process.argv[4] || "360x780,390x844,412x915,1440x900").split(",").map((s) => s.split("x").map(Number));
for (const [w, h] of sizes) for (const L of ["en","ur","ar"]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:1, hasTouch:w<800, isMobile:w<800 });
  const p = await ctx.newPage(); const errs=[]; p.on("pageerror",(e)=>errs.push(e.message));
  await p.goto(`${BASE}/?lang=${L}`); await p.waitForSelector("canvas"); await p.waitForTimeout(1500);
  for (const f of [1,2,3]) {
    await p.locator(".seg.floors button").nth(f-1).click(); await p.waitForTimeout(2500);
    const cv = p.locator(".canvas canvas"), cb = await cv.boundingBox();
    const png = (await cv.screenshot()).toString("base64");
    const r = await p.evaluate(async ([png, cb]) => {
      const box = (s) => [...document.querySelectorAll(s)].filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect());
      const over = [...box(".model-head"), ...box(".model-foot")].some(r => r.bottom > cb.y + 1 && r.top < cb.y + cb.height - 1);
      const im = new Image(); im.src = "data:image/png;base64," + png; await im.decode();
      const g = document.createElement("canvas"); g.width = im.width; g.height = im.height; const x = g.getContext("2d"); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, g.width, g.height).data, bg = [d[0], d[1], d[2]];
      let t = 1e9, bo = -1, l = 1e9, ri = -1;
      for (let y = 0; y < g.height; y++) for (let i = 0; i < g.width; i++) { const k = (y * g.width + i) * 4; if (Math.abs(d[k]-bg[0]) + Math.abs(d[k+1]-bg[1]) + Math.abs(d[k+2]-bg[2]) > 45) { t = Math.min(t, y); bo = Math.max(bo, y); l = Math.min(l, i); ri = Math.max(ri, i); } }
      return { over, H: g.height, W: g.width, t, bo, l, ri, title: document.title, brand: /Saafi/.test(document.body.innerText) };
    }, [png, cb]);
    ok(!r.over, `${w} ${L} f${f} text overlaps canvas`);
    ok(r.t > 1 && r.bo < r.H - 2 && r.l > 1 && r.ri < r.W - 2, `${w} ${L} f${f} house clipped ${JSON.stringify(r)}`);
    ok((r.bo - r.t) / r.H > 0.6 || (r.ri - r.l) / r.W > 0.6, `${w} ${L} f${f} house small h${((r.bo-r.t)/r.H).toFixed(2)} w${((r.ri-r.l)/r.W).toFixed(2)}`);
    ok(!r.brand && !/Saafi/.test(r.title), `${w} ${L} brand shown`);
    console.log(`${w} ${L} f${f} fill h${((r.bo-r.t)/r.H).toFixed(2)} w${((r.ri-r.l)/r.W).toFixed(2)} canvas ${Math.round(cb.height)}/${h}`);
    if (w !== 1440 || L === "en") await p.screenshot({ path: `${OUT}/fix-${w}-${L}-${f}floor.png` });
  }
  ok(!errs.length, `${w} ${L} errors ${errs}`); await ctx.close();
}
await b.close(); console.log(fail ? `${fail} FAILED` : "ALL PASS"); process.exit(fail ? 1 : 0);
