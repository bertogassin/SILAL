import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";

const chrome =
  process.env.AGENT_BROWSER_EXECUTABLE_PATH ||
  "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});

await page.goto(pathToFileURL("/workspace/.grok/og-card.html").href, {
  waitUntil: "load",
});
await page.screenshot({
  path: "/workspace/.grok/og-raw.png",
  type: "png",
  omitBackground: false,
});

const svg = await readFile("/workspace/.grok/favicon.svg.tmp", "utf8");

async function snapFav(size, out) {
  const p = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await p.setContent(
    `<!doctype html><html><head><style>
      html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:#0B1F1A;overflow:hidden}
      svg{display:block;width:${size}px;height:${size}px}
    </style></head><body>${svg}</body></html>`,
    { waitUntil: "load" },
  );
  await p.screenshot({ path: out, type: "png" });
  await p.close();
}

await snapFav(16, "/workspace/.grok/favicon-16.png");
await snapFav(32, "/workspace/.grok/favicon-32.png");
await snapFav(64, "/workspace/.grok/favicon-64.png");

await browser.close();
console.log("rendered og-raw.png and favicon QC rasters");
