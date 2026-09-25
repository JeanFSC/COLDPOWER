import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const laminaDir = fileURLToPath(new URL(".", import.meta.url));
const outputDir = resolve(laminaDir, "..");
await mkdir(outputDir, { recursive: true });

const cases = [
  { screen: "hub-desktop", width: 1920, height: 1080, file: "cuenta-hub-desktop-1920x1080.png" },
  { screen: "hub-mobile", width: 390, height: 844, file: "cuenta-hub-mobile-390x844.png" },
  { screen: "pedidos", width: 1920, height: 1080, file: "cuenta-pedidos-desktop-1920x1080.png" },
  { screen: "vacia", width: 1920, height: 1080, file: "cuenta-vacia-desktop-1920x1080.png" },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const item of cases) {
    const page = await browser.newPage({ viewport: { width: item.width, height: item.height }, deviceScaleFactor: 1 });
    const url = `${pathToFileURL(resolve(laminaDir, "index.html")).href}?screen=${item.screen}`;
    await page.goto(url, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector("#main-content");
    await page.screenshot({ path: resolve(outputDir, item.file), fullPage: false, animations: "disabled" });
    const metrics = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight, scrollWidth: document.documentElement.scrollWidth, fonts: document.fonts.status }));
    console.log(`${item.file}: ${metrics.width}x${metrics.height}, scrollWidth=${metrics.scrollWidth}, fonts=${metrics.fonts}`);
    if (metrics.width !== item.width || metrics.height !== item.height) throw new Error(`Viewport mismatch for ${item.file}`);
    if (metrics.scrollWidth > item.width) throw new Error(`Horizontal overflow for ${item.file}: ${metrics.scrollWidth}px`);
    await page.close();
  }
} finally {
  await browser.close();
}
