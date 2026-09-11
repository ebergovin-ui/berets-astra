import { readFile } from "node:fs/promises";
import vm from "node:vm";

const [html, app, matcher, dataSource, authorSource] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../shape-matcher.js", import.meta.url), "utf8"),
  readFile(new URL("../constellations.js", import.meta.url), "utf8"),
  readFile(new URL("./author_schemes.json", import.meta.url), "utf8"),
]);
const authorSchemes = JSON.parse(authorSource);

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

if (objects.some((item) => item.source === "teacher-document" || item.id.endsWith("-coordinates"))) throw new Error("Coordinate-only duplicate tasks must not be emitted");
for (const object of objects) {
  const author = authorSchemes[object.id];
  if (!author || object.source !== "author-reference") throw new Error(`${object.id}: protected author reference missing`);
  if (object.points.length !== author.points.length || object.edges.length !== author.edges.length) throw new Error(`${object.id}: generated data differs from author reference`);
}
if (!objects.find((item) => item.id === "CVn")?.alphaAnyPoint) throw new Error("Canes Venatici must accept either endpoint as the alpha-star position");
if (!app.includes("minY: -16, maxY: 16")) throw new Error("Both grid axes must span -16..16");
if (!app.includes("left: 200, right: 800, top: 40, bottom: 640")) throw new Error("Grid plotting area must be square");
if (html.includes('id="grid"') || html.includes('url(#grid)')) throw new Error("Duplicate decorative grid must not exist");
if (!app.includes("connection-guide")) throw new Error("Missing animated guide for an unconnected edge");
if (!html.includes('id="skipButton"') || !html.includes('id="doneButton"') || html.includes('id="liftButton"')) throw new Error("Done and skip must remain and the obsolete break-line button must be removed");
if (html.includes("<details class=\"coordinate-entry-shell\"")) throw new Error("Coordinate entry must always be visible");
if (!html.includes("guide-demo__screen")) throw new Error("Animated visual guide is missing");
if (!app.includes("resetGuideDemo") || !app.includes("Нажмите готовую вершину — она станет оранжевой") || !app.includes("форма Геркулеса зачтена")) throw new Error("Guide must demonstrate Hercules branch switching and final similarity");
if ((html.match(/class="demo-star"/g) || []).length !== 15 || (html.match(/class="demo-edge"/g) || []).length !== 15) throw new Error("Guide must show the full 15-point Hercules schematic");
if (!app.includes("DEFAULT_PASS_PERCENT = 70") || !app.includes("preferences.passPercent") || app.includes("evaluateCoordinateShape")) throw new Error("Adjustable 70% transform-invariant grading must remain");
if (!html.includes('id="thresholdRange"') || !html.includes('name="theme"') || !html.includes('id="starNameChoices"')) throw new Error("Training threshold, theme and alpha-name quiz controls are missing");
if (!app.includes('theme: "dark"') || !app.includes("Первая вершина выбрана автоматически") || !app.includes("state.pendingUserIndex === index")) throw new Error("Dark default and automatic pink naming focus are missing");
if (app.includes("Выбрана не «${state.item.alpha}»")) throw new Error("Wrong alpha-position feedback must not reveal the answer");
if (!matcher.includes("reference.points.length === 2") || !matcher.includes("segmentIntersectionFeature")) throw new Error("Segment and crossing-aware scoring rules are missing");
if (!app.includes("branchArmed") || !app.includes("Контур замкнут")) throw new Error("Automatic branch and contour interaction is missing");
if (!app.includes("Выбор точки ${target + 1} снят") || !app.includes("state.active = null")) throw new Error("Repeated active-point click must release the drawing branch");
if (!html.includes('id="roundTotal">27</span>')) throw new Error("The 27-task deck total is missing");
if (!html.includes('id="settingsDialog"') || !html.includes('id="referenceSave"')) throw new Error("Reference editor settings are missing");
if (!app.includes("REFERENCE_STORAGE_KEY") || !app.includes("saveReferenceEditor") || !app.includes("resetReferenceEditor")) throw new Error("Persistent custom reference workflow is missing");
if (!app.includes("PERSONAL_STORAGE_KEY") || !app.includes("savePersonalObjects") || !html.includes('id="personalObjectForm"') || !html.includes('id="personalAddToggle"')) {
  throw new Error("Persistent personal constellation creation is missing");
}
if (!app.includes("Активная вершина переключена") || !app.includes("editor.branchArmed") || !html.includes("Сохранить мой эталон")) {
  throw new Error("Reference editor must support branch switching and isolated personal saves");
}

console.log("Verified: CSP, safe DOM, 27 protected references, personal constellations, adjustable grading/theme, alpha-name quiz and shape invariants.");
