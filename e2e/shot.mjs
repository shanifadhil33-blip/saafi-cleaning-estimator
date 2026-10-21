import { chromium } from "playwright-core";
const [url, out] = [process.argv[2], process.argv[3]];
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox","--enable-unsafe-swiftshader","--use-angle=swiftshader"] });
for (const [w,h] of [[390,844],[1440,900]]) {
  const p = await (await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:1, hasTouch:w<800, isMobile:w<800 })).newPage();
  p.on("pageerror", e=>console.log("ERR", e.message));
  await p.goto(url); await p.waitForTimeout(5000); await p.screenshot({ path: `${out}-${w}.png` });
}
await b.close();
