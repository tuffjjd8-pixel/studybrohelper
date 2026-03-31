import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({ serveUrl: bundled, id: "main", puppeteerInstance: browser });

const frames = [15, 100, 250, 450, 600, 800];
for (const frame of frames) {
  await renderStill({
    composition, serveUrl: bundled,
    output: `/tmp/frame-${frame}.png`,
    frame,
    puppeteerInstance: browser,
  });
  console.log(`Frame ${frame} rendered`);
}

await browser.close({ silent: false });
