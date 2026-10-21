import { chromium } from "playwright-core";
const BASE = process.argv[2] || "http://localhost:3311";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox","--enable-unsafe-swiftshader","--use-angle=swiftshader"] });
let fail=0;
for (const w of [390,1440]) for (const L of ["en","ur","ar"]) {
  const ctx = await b.newContext({ viewport:{width:w,height:w<800?844:900}, hasTouch:w<800, isMobile:w<800 });
  const p = await ctx.newPage(); let taps=0, url="";
  ctx.on("page", async (np) => { url = np.url(); });
  await p.goto(`${BASE}/?lang=${L}`); await p.waitForSelector("canvas"); await p.waitForTimeout(1200);
  await p.locator(w<1024?".mobile-bar .cta":".summary .cta").click(); taps++;
  await p.waitForSelector("[role=dialog]"); await p.waitForTimeout(500);
  await p.keyboard.type("Omar Khan"); await p.keyboard.press("Enter"); // keyboard Next, no extra tap
  await p.keyboard.type("0501234567"); await p.keyboard.press("Enter"); taps++; // Send key on keyboard
  await p.waitForTimeout(1500); url = url || (await ctx.pages()).slice(1).map(x=>x.url()).join();
  const ok = /971500000000/.test(url) || await p.getByRole("heading").filter({hasText:/WhatsApp|واٹس|واتساب/}).count();
  console.log(`${ok?"PASS":"FAIL"} ${w} ${L} taps ${taps} (+typing) -> ${url.slice(0,60)}`); if(!ok)fail++;
  await ctx.close();
}
await b.close(); process.exit(fail?1:0);
