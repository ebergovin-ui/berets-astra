import { readFile } from "node:fs/promises";
import vm from "node:vm";

const [html, app, dataSource] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../constellations.js", import.meta.url), "utf8"),
]);

const requiredCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "require-trusted-types-for 'script'",
];
for (const directive of requiredCsp) {
  if (!html.includes(directive)) throw new Error(`CSP directive missing: ${directive}`);
}

for (const unsafeSink of [".innerHTML", ".outerHTML", "insertAdjacentHTML", "eval(", "new Function"]) {
  if (app.includes(unsafeSink)) throw new Error(`Unsafe JavaScript sink found: ${unsafeSink}`);
}

const sandbox = { window: {} };
vm.runInNewContext(dataSource, sandbox, { timeout: 1000 });
const objects = sandbox.window.CONSTELLATIONS;
if (!Array.isArray(objects) || objects.length !== 27) throw new Error("Expected 27 practice objects");

for (const object of objects) {
  const coordinateKeys = new Set();
  for (const point of object.points) {
    if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) throw new Error(`${object.id}: non-integer coordinate`);
    if (point.x < -16 || point.x > 16 || point.y < -16 || point.y > 16) throw new Error(`${object.id}: coordinate outside grid`);
    const key = `${point.x},${point.y}`;
    if (coordinateKeys.has(key)) throw new Error(`${object.id}: duplicate coordinate ${key}`);
    coordinateKeys.add(key);
  }
  if (object.pointNames.length !== object.points.length) throw new Error(`${object.id}: point name count mismatch`);
}

const orion = objects.find((object) => object.id === "Ori");
if (orion.points.length !== 8 || orion.edges.length !== 7) throw new Error("Orion must use the compact 8-point school figure");
const taurus = objects.find((object) => object.id === "Tau");
if (taurus.points.length !== 7 || taurus.edges.length !== 6 || taurus.points[taurus.alphaIndex].x !== -5) {
  throw new Error("Taurus must use the recognizable seven-point V figure with Aldebaran on its left arm");
}
for (const object of objects.filter((item) => item.source === "curated-school-scheme")) {
  if (object.points.length > 10) throw new Error(`${object.id}: curated figure is too detailed`);
}
if (!app.includes("minY: -16, maxY: 16")) throw new Error("Both grid axes must span -16..16");
if (!app.includes("left: 200, right: 800, top: 40, bottom: 640")) throw new Error("Grid plotting area must be square");
if (!app.includes("connection-guide")) throw new Error("Missing animated guide for an unconnected edge");
if (!html.includes('id="skipButton"') || !html.includes('id="liftButton"')) throw new Error("Skip and break-line controls must be present");
if (html.includes("<details class=\"coordinate-entry-shell\"")) throw new Error("Coordinate entry must always be visible");
if (!html.includes("guide-demo__screen")) throw new Error("Animated visual guide is missing");

console.log("Verified: CSP, safe DOM sinks, 27 compact objects, ±16 grid, hints and point names.");
