import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const out = new URL("../dist/", import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const file of ["index.html", "styles.css", "app.js", "shape-matcher.js", "constellations.js", "robots.txt", "sitemap.xml", "site.webmanifest", "favicon.svg"]) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(`../dist/${file}`, import.meta.url));
}
await cp(new URL("../assets/", import.meta.url), new URL("../dist/assets/", import.meta.url), { recursive: true });

console.log(`Static site built at ${join(new URL(out).pathname, "index.html")}`);
