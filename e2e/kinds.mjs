import { chromium } from "playwright-core";
const [BASE, OUT] = [process.argv[2] || "http://localhost:3311", process.argv[3] || "/workspace/qa/saafi/v3"];
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox","--enable-unsafe-swiftshader","--use-angle=swiftshader"] });
const p = await (await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, hasTouch:true, isMobile:true })).newPage();
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto(BASE); await p.waitForSelector("canvas"); await p.waitForTimeout(2500);
for (const k of ["studio","apartment","townhouse","villa","penthouse"]) {
  await p.locator(`.kind[data-kind=${k}]`).click(); await p.waitForTimeout(2600);
  console.log(k, await p.locator("#homeTitle").innerText(), "|", await p.locator("#homeSub").innerText(), "|", await p.locator(".bar .price").innerText());
  await p.screenshot({ path: `${OUT}/kind-390-${k}.png` });
}
console.log(errs.length ? "ERR " + errs : "no errors"); await b.close();
