(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ASTRA_SHAPE_MATCHER = api;
})(typeof window !== "undefined" ? window : globalThis, () => {
  "use strict";

  const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(value)));
  const edgeKey = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;

  function adjacency(nodeCount, edges) {
    const result = Array.from({ length: nodeCount }, () => new Set());
    edges.forEach(([a, b]) => {
      if (a === b || !result[a] || !result[b]) return;
      result[a].add(b);
      result[b].add(a);
    });
    return result;
  }

  function graphMappings(reference, user, limit = 20000) {
    if (reference.points.length !== user.points.length || reference.edges.length !== user.edges.length) return [];
    const refAdj = adjacency(reference.points.length, reference.edges);
    const userAdj = adjacency(user.points.length, user.edges);
    const order = [...reference.points.keys()].sort((a, b) => {
      const degreeDifference = refAdj[b].size - refAdj[a].size;
      if (degreeDifference) return degreeDifference;
      const aNeighbors = [...refAdj[a]].map((index) => refAdj[index].size).sort().join(",");
      const bNeighbors = [...refAdj[b]].map((index) => refAdj[index].size).sort().join(",");
      return bNeighbors.localeCompare(aNeighbors);
    });
    const mapping = Array(reference.points.length).fill(-1);
    const used = new Set();
    const results = [];

    function visit(position) {
      if (results.length >= limit) return;
      if (position === order.length) {
        results.push([...mapping]);
        return;
      }
      const refIndex = order[position];
      for (let userIndex = 0; userIndex < user.points.length; userIndex += 1) {
        if (used.has(userIndex) || userAdj[userIndex].size !== refAdj[refIndex].size) continue;
        let compatible = true;
        for (let previous = 0; previous < position; previous += 1) {
          const otherRef = order[previous];
          const otherUser = mapping[otherRef];
          if (refAdj[refIndex].has(otherRef) !== userAdj[userIndex].has(otherUser)) {
            compatible = false;
            break;
          }
        }
        if (!compatible) continue;
        mapping[refIndex] = userIndex;
        used.add(userIndex);
        visit(position + 1);
        used.delete(userIndex);
        mapping[refIndex] = -1;
      }
    }

    visit(0);
    return results;
  }

  function centered(points) {
    const center = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
    center.x /= Math.max(points.length, 1);
    center.y /= Math.max(points.length, 1);
    return points.map((point) => ({ x: point.x - center.x, y: point.y - center.y }));
  }

  function procrustesResidual(referencePoints, userPoints, mapping) {
    const reference = centered(referencePoints);
    const user = centered(mapping.map((userIndex) => userPoints[userIndex]));
    const userEnergy = user.reduce((sum, point) => sum + point.x ** 2 + point.y ** 2, 0);
    if (userEnergy < 1e-9) return Infinity;
    let best = Infinity;

    for (const reflected of [false, true]) {
      const prepared = reference.map((point) => ({ x: reflected ? -point.x : point.x, y: point.y }));
      let dot = 0;
      let cross = 0;
      prepared.forEach((point, index) => {
        dot += point.x * user[index].x + point.y * user[index].y;
        cross += point.x * user[index].y - point.y * user[index].x;
      });
      const angle = Math.atan2(cross, dot);
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const rotated = prepared.map((point) => ({
        x: point.x * cosine - point.y * sine,
        y: point.x * sine + point.y * cosine,
      }));
      const referenceEnergy = rotated.reduce((sum, point) => sum + point.x ** 2 + point.y ** 2, 0) || 1;
      const scale = Math.max(0, rotated.reduce((sum, point, index) => sum + point.x * user[index].x + point.y * user[index].y, 0) / referenceEnergy);
      const error = rotated.reduce((sum, point, index) => {
        const dx = point.x * scale - user[index].x;
        const dy = point.y * scale - user[index].y;
        return sum + dx ** 2 + dy ** 2;
      }, 0);
      best = Math.min(best, Math.sqrt(error / userEnergy));
    }
    return best;
  }

  function incompleteSimilarity(reference, user) {
    const pointRatio = Math.min(reference.points.length, user.points.length) / Math.max(reference.points.length, user.points.length, 1);
    const edgeRatio = Math.min(reference.edges.length, user.edges.length) / Math.max(reference.edges.length, user.edges.length, 1);
    return Math.min(84, clampPercent((pointRatio * .45 + edgeRatio * .55) * 84));
  }

  function segmentIntersectionFeature(points, edges) {
    if (edges.length !== 2 || edges.some(([a, b]) => !points[a] || !points[b])) return null;
    const [a, b] = edges[0].map((index) => points[index]);
    const [c, d] = edges[1].map((index) => points[index]);
    const r = { x: b.x - a.x, y: b.y - a.y };
    const s = { x: d.x - c.x, y: d.y - c.y };
    const cross = (u, v) => u.x * v.y - u.y * v.x;
    const denominator = cross(r, s);
    if (Math.abs(denominator) < 1e-9) return { crosses: false, ratios: [] };
    const offset = { x: c.x - a.x, y: c.y - a.y };
    const t = cross(offset, s) / denominator;
    const u = cross(offset, r) / denominator;
    const crosses = t >= 0 && t <= 1 && u >= 0 && u <= 1;
    return { crosses, ratios: crosses ? [Math.min(t, 1 - t), Math.min(u, 1 - u)].sort((x, y) => x - y) : [] };
  }

  function evaluate(reference, user, passPercent = 70) {
    if (reference.points.length !== user.points.length || reference.edges.length !== user.edges.length) {
      const similarity = incompleteSimilarity(reference, user);
      return {
        ok: false,
        similarity,
        mapping: null,
        reason: `Сходство ${similarity}%. Схема пока не завершена: добавьте недостающие точки или соединения.`,
      };
    }
    const mappings = graphMappings(reference, user);
    if (!mappings.length) {
      const refDegrees = adjacency(reference.points.length, reference.edges).map((neighbors) => neighbors.size).sort((a, b) => a - b);
      const userDegrees = adjacency(user.points.length, user.edges).map((neighbors) => neighbors.size).sort((a, b) => a - b);
      const matchingDegrees = refDegrees.filter((degree, index) => degree === userDegrees[index]).length;
      const similarity = Math.min(84, clampPercent(48 + 36 * matchingDegrees / Math.max(refDegrees.length, 1)));
      return { ok: false, similarity, mapping: null, reason: `Сходство ${similarity}%. Некоторые вершины соединены не так, как в авторском эталоне.` };
    }
    if (reference.points.length === 2 && reference.edges.length === 1) {
      return { ok: true, similarity: 100, mapping: mappings[0] };
    }
    let best = { residual: Infinity, mapping: null };
    mappings.forEach((mapping) => {
      const residual = procrustesResidual(reference.points, user.points, mapping);
      if (residual < best.residual) best = { residual, mapping };
    });
    let similarity = clampPercent(100 - best.residual * 100);
    const referenceIntersection = segmentIntersectionFeature(reference.points, reference.edges);
    if (referenceIntersection?.crosses) {
      const userIntersection = segmentIntersectionFeature(user.points, user.edges);
      if (!userIntersection?.crosses) {
        similarity = Math.min(similarity, 55);
      } else {
        const ratioError = referenceIntersection.ratios.reduce((sum, value, index) => sum + Math.abs(value - userIntersection.ratios[index]), 0) / 2;
        const intersectionSimilarity = clampPercent(100 - ratioError * 200);
        similarity = clampPercent(similarity * .65 + intersectionSimilarity * .35);
      }
    }
    return similarity >= passPercent
      ? { ok: true, similarity, mapping: best.mapping }
      : {
          ok: false,
          similarity,
          mapping: best.mapping,
          reason: `Сходство ${similarity}%. Для зачёта нужно не меньше ${passPercent}%. Подправьте пропорции или углы.`,
        };
  }

  return { evaluate, graphMappings, procrustesResidual, segmentIntersectionFeature, edgeKey };
});
