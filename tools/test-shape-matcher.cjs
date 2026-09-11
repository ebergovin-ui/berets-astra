const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { evaluate } = require("../shape-matcher.js");

const reference = {
  points: [
    { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 },
    { x: -3, y: 1 }, { x: -6, y: 2 },
  ],
  edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5]],
};

function transformed({ scale = 1, angle = 0, reflected = false, dx = 0, dy = 0 } = {}) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return reference.points.map((point) => {
    const x = (reflected ? -point.x : point.x) * scale;
    const y = point.y * scale;
    return { x: x * cosine - y * sine + dx, y: x * sine + y * cosine + dy };
  });
}

for (const options of [
  { scale: 2.7, dx: 8, dy: -11 },
  { scale: .45, angle: Math.PI / 3, dx: -2, dy: 7 },
  { scale: 1.8, angle: Math.PI * 1.37, reflected: true, dx: 4, dy: 3 },
]) {
  const result = evaluate(reference, { points: transformed(options), edges: reference.edges }, 70);
  assert.equal(result.ok, true);
  assert.equal(result.similarity, 100);
  assert.deepEqual(result.mapping, [0, 1, 2, 3, 4, 5]);
}

const reordered = { points: transformed().reverse(), edges: reference.edges.map(([a, b]) => [5 - a, 5 - b]) };
assert.equal(evaluate(reference, reordered, 70).ok, true);

const incompleteUser = { points: reference.points.slice(0, 5), edges: reference.edges.slice(0, 5) };
const incompleteAt70 = evaluate(reference, incompleteUser, 70);
assert.equal(incompleteAt70.ok, true, "a structurally correct partial drawing must respect the configured threshold");
assert.ok(incompleteAt70.similarity >= 70);
assert.equal(evaluate(reference, incompleteUser, 85).ok, false, "the same drawing must fail above its score");

const wrongEdges = { points: reference.points, edges: [[0, 1], [1, 2], [2, 3], [3, 0], [1, 4], [4, 5]] };
assert.equal(evaluate(reference, wrongEdges, 70).ok, false);

const singleSegment = { points: [{ x: -2, y: 1 }, { x: 3, y: 4 }], edges: [[0, 1]] };
const arbitrarySegment = { points: [{ x: -15, y: 12 }, { x: -14, y: 12 }], edges: [[0, 1]] };
assert.deepEqual(evaluate(singleSegment, arbitrarySegment), { ok: true, similarity: 100, mapping: [0, 1] });

const cross = { points: [{ x: 0, y: 8 }, { x: 0, y: -8 }, { x: -12, y: 0 }, { x: 4, y: 0 }], edges: [[0, 1], [2, 3]] };
const transformedCross = { points: [{ x: 7, y: 16 }, { x: 7, y: -16 }, { x: -17, y: 0 }, { x: 15, y: 0 }], edges: [[0, 1], [2, 3]] };
assert.equal(evaluate(cross, transformedCross, 70).ok, true);
const nonCrossing = { points: [{ x: 0, y: 8 }, { x: 0, y: 2 }, { x: -12, y: 0 }, { x: 4, y: 0 }], edges: [[0, 1], [2, 3]] };
assert.equal(evaluate(cross, nonCrossing, 70).ok, false);

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve("../constellations.js"), "utf8"), sandbox);
for (const item of sandbox.window.CONSTELLATIONS.filter((entry) => entry.source !== "teacher-document")) {
  const cosine = Math.cos(.73);
  const sine = Math.sin(.73);
  const points = item.points.map((point) => {
    const x = -point.x * 1.6;
    const y = point.y * 1.6;
    return { x: x * cosine - y * sine + 5, y: x * sine + y * cosine - 4 };
  });
  const result = evaluate(item, { points, edges: item.edges }, 70);
  assert.equal(result.ok, true, `${item.id} transformed figure should pass`);
  assert.equal(result.similarity, 100, `${item.id} transformed figure should score 100%`);

  const order = [...item.points.keys()].map((_, index, values) => values[(index + 3) % values.length]);
  const newIndex = new Map(order.map((oldIndex, index) => [oldIndex, index]));
  const reorderedExact = {
    points: order.map((index) => ({ ...item.points[index] })),
    edges: item.edges.map(([a, b]) => [newIndex.get(a), newIndex.get(b)]),
  };
  const exactResult = evaluate(item, reorderedExact, 70);
  assert.equal(exactResult.ok, true, `${item.id} exact custom-reference geometry should pass in any drawing order`);
  assert.equal(exactResult.similarity, 100, `${item.id} exact custom-reference geometry should score 100%`);
}

console.log("Shape matcher verified: free transforms, one-segment equivalence, crossing proportions, order, incomplete and wrong topology.");
