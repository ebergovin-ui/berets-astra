import { readFile } from "node:fs/promises";
import vm from "node:vm";

const [html, app, matcher, dataSource] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../shape-matcher.js", import.meta.url), "utf8"),
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
  if (app.includes(unsafeSink) || matcher.includes(unsafeSink)) throw new Error(`Unsafe JavaScript sink found: ${unsafeSink}`);
}

const sandbox = { window: {} };
vm.runInNewContext(dataSource, sandbox, { timeout: 1000 });
const objects = sandbox.window.CONSTELLATIONS;
if (!Array.isArray(objects) || objects.length !== 36) throw new Error("Expected 27 schematic plus nine coordinate practice objects");

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
if (orion.points.length !== 7 || orion.edges.length !== 6 || orion.source !== "wikipedia-wikimedia") {
  throw new Error("Orion must use the verified compact seven-star figure");
}
const taurus = objects.find((object) => object.id === "Tau");
if (taurus.points.length !== 9 || taurus.edges.length !== 8 || taurus.source !== "wikipedia-wikimedia") {
  throw new Error("Taurus must use the verified Hyades-and-horns figure");
}
const gemini = objects.find((object) => object.id === "Gem");
if (gemini.points.length !== 8 || gemini.edges.length !== 6) throw new Error("Gemini must match the two Wikipedia chains");
const cepheus = objects.find((object) => object.id === "Cep");
if (cepheus.points.length !== 7 || cepheus.edges.length !== 7) throw new Error("Cepheus must include the Wikipedia loop and Eta branch");
const draco = objects.find((object) => object.id === "Dra");
if (draco.points.length !== 11 || draco.edges.length !== 11) throw new Error("Draco must include the Wikipedia head loop and tail");
const teacherUrsaMajor = objects.find((object) => object.id === "UMa-coordinates");
if (JSON.stringify(teacherUrsaMajor.points) !== JSON.stringify([{ x: -15, y: -7 }, { x: -10, y: -5 }, { x: -3, y: -6 }, { x: 6, y: -6 }, { x: 5, y: -10 }, { x: -1, y: -10 }])) {
  throw new Error("The exact teacher-document Ursa Major coordinates changed");
}
if (objects.filter((item) => item.source === "teacher-document").length !== 9) throw new Error("Expected nine teacher-document coordinate tasks");
const wikipediaObjects = objects.filter((item) => item.source === "wikipedia-wikimedia");
if (wikipediaObjects.length !== 25) throw new Error("Expected all twenty-five constellations as Wikipedia/Wikimedia schematic tasks");
if (wikipediaObjects.some((item) => !item.sourceUrl?.startsWith("https://commons.wikimedia.org/wiki/File:"))) {
  throw new Error("Every schematic constellation must cite its Wikimedia source map");
}
if (!app.includes("minY: -16, maxY: 16")) throw new Error("Both grid axes must span -16..16");
if (!app.includes("left: 200, right: 800, top: 40, bottom: 640")) throw new Error("Grid plotting area must be square");
if (html.includes('id="grid"') || html.includes('url(#grid)')) throw new Error("Duplicate decorative grid must not exist");
if (!app.includes("connection-guide")) throw new Error("Missing animated guide for an unconnected edge");
if (!html.includes('id="skipButton"') || !html.includes('id="doneButton"') || html.includes('id="liftButton"')) throw new Error("Done and skip must remain and the obsolete break-line button must be removed");
if (html.includes("<details class=\"coordinate-entry-shell\"")) throw new Error("Coordinate entry must always be visible");
if (!html.includes("guide-demo__screen")) throw new Error("Animated visual guide is missing");
if (!app.includes("resetGuideDemo") || !app.includes("Нажмите вершину ещё раз") || !app.includes("Сходство 96%")) throw new Error("Guide must demonstrate branch switching and final similarity");
if (!app.includes("SCHEMATIC_PASS_PERCENT = 85") || !app.includes("evaluateCoordinateShape")) throw new Error("Mixed schematic and coordinate grading is missing");
if (!app.includes("branchArmed") || !app.includes("Контур замкнут")) throw new Error("Automatic branch and contour interaction is missing");
if (!html.includes('id="roundTotal">36</span>')) throw new Error("The mixed 36-task deck total is missing");

console.log("Verified: CSP, safe DOM sinks, Wikipedia figures, mixed grading, branch drawing, square grid, staged guide and point names.");
