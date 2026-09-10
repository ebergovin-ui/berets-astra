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
if (!Array.isArray(objects) || objects.length !== 27) throw new Error("Expected exactly 25 constellation and two asterism tasks");

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
if (orion.points.length !== 8 || orion.edges.length !== 7 || orion.source !== "wikipedia-wikimedia") {
  throw new Error("Orion must include shoulders, belt, feet and Hatysa");
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
if (draco.points.length !== 16 || draco.edges.length !== 16) throw new Error("Draco must use the accepted sixteen-star head-and-tail figure");
if (objects.some((item) => item.source === "teacher-document" || item.id.endsWith("-coordinates"))) throw new Error("Coordinate-only duplicate tasks must not be emitted");
const pegasus = objects.find((object) => object.id === "Peg");
if (pegasus.points.length !== 10 || pegasus.edges.length !== 10) throw new Error("Pegasus must include the Great Square and both branches");
const cygnus = objects.find((object) => object.id === "Cyg");
if (cygnus.points.length !== 6 || cygnus.edges.length !== 5) throw new Error("Cygnus must use the recognizable six-star cross");
const canisMajor = objects.find((object) => object.id === "CMa");
if (canisMajor.points.length !== 7 || canisMajor.edges.length !== 6) throw new Error("Canis Major must use the supplied seven-star outline");
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
if (!app.includes("SCHEMATIC_PASS_PERCENT = 85") || app.includes("evaluateCoordinateShape")) throw new Error("Only transform-invariant schematic grading should remain");
if (!app.includes("branchArmed") || !app.includes("Контур замкнут")) throw new Error("Automatic branch and contour interaction is missing");
if (!html.includes('id="roundTotal">27</span>')) throw new Error("The 27-task deck total is missing");
if (!html.includes('id="settingsDialog"') || !html.includes('id="referenceSave"')) throw new Error("Reference editor settings are missing");
if (!app.includes("REFERENCE_STORAGE_KEY") || !app.includes("saveReferenceEditor") || !app.includes("resetReferenceEditor")) throw new Error("Persistent custom reference workflow is missing");
if (!app.includes("Активная вершина переключена") || !app.includes("editor.branchArmed") || !html.includes("Сохранить мой эталон")) {
  throw new Error("Reference editor must support branch switching and isolated personal saves");
}

console.log("Verified: CSP, safe DOM sinks, 27 schematic tasks, corrected Wikipedia figures, protected personal references, branch switching and square grid.");
