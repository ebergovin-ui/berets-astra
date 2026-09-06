(() => {
  "use strict";

  const objects = window.CONSTELLATIONS;
  const GRID = { minX: -16, maxX: 16, minY: -11, maxY: 11, left: 70, right: 930, top: 60, bottom: 620 };
  const SVG_NS = "http://www.w3.org/2000/svg";

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    title: $("#taskTitle"),
    type: $("#taskType"),
    round: $("#roundIndex"),
    instruction: $("#instructionText"),
    status: $("#statusText"),
    count: $("#connectionCount"),
    pen: $("#penState"),
    phases: [...document.querySelectorAll(".phase")],
    phaseTwoLabel: $("#phaseTwoLabel"),
    svg: $("#skySvg"),
    sky: $("#sky"),
    ambient: $("#ambientLayer"),
    answer: $("#answerLayer"),
    lines: $("#lineLayer"),
    hints: $("#hintLayer"),
    stars: $("#starLayer"),
    hintButton: $("#hintButton"),
    checkButton: $("#checkButton"),
    liftButton: $("#liftButton"),
    undoButton: $("#undoButton"),
    clearButton: $("#clearButton"),
    answerButton: $("#answerButton"),
    resultPanel: $("#resultPanel"),
    resultLabel: $("#resultLabel"),
    resultTitle: $("#resultTitle"),
    resultText: $("#resultText"),
    answerFact: $("#answerFact"),
    nextButton: $("#nextButton"),
    streak: $("#streakValue"),
    mastered: $("#masteredValue"),
  };

  const requestedId = new URLSearchParams(location.search).get("object");
  const requestedIndex = objects.findIndex((item) => item.id === requestedId);
  const randomDeck = shuffle([...objects.keys()].filter((index) => index !== requestedIndex));

  const state = {
    deck: requestedIndex >= 0 ? [requestedIndex, ...randomDeck] : shuffle([...objects.keys()]),
    deckPosition: 0,
    item: null,
    phase: "draw",
    points: [],
    edges: [],
    active: null,
    selected: new Set(),
    hintCount: 0,
    failedChecks: 0,
    fullAnswer: false,
    history: [],
    keyboardCursor: { x: 0, y: 0 },
    stats: readStats(),
  };

  function shuffle(values) {
    for (let i = values.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }

  function readStats() {
    try {
      return JSON.parse(localStorage.getItem("astra-stats")) || { streak: 0, mastered: [] };
    } catch {
      return { streak: 0, mastered: [] };
    }
  }

  function saveStats() {
    try { localStorage.setItem("astra-stats", JSON.stringify(state.stats)); } catch { /* private mode */ }
    elements.streak.textContent = state.stats.streak;
    elements.mastered.textContent = state.stats.mastered.length;
  }

  function svgElement(tag, attributes = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  function toSvg(point) {
    return {
      x: GRID.left + ((point.x - GRID.minX) / (GRID.maxX - GRID.minX)) * (GRID.right - GRID.left),
      y: GRID.bottom - ((point.y - GRID.minY) / (GRID.maxY - GRID.minY)) * (GRID.bottom - GRID.top),
    };
  }

  function fromSvg(x, y) {
    const gx = GRID.minX + ((x - GRID.left) / (GRID.right - GRID.left)) * (GRID.maxX - GRID.minX);
    const gy = GRID.minY + ((GRID.bottom - y) / (GRID.bottom - GRID.top)) * (GRID.maxY - GRID.minY);
    return {
      x: Math.max(GRID.minX, Math.min(GRID.maxX, Math.round(gx * 2) / 2)),
      y: Math.max(GRID.minY, Math.min(GRID.maxY, Math.round(gy * 2) / 2)),
    };
  }

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
  }

  function edgeKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

  function drawGrid() {
    elements.ambient.replaceChildren();
    for (let x = GRID.minX; x <= GRID.maxX; x += 1) {
      const start = toSvg({ x, y: GRID.minY });
      const end = toSvg({ x, y: GRID.maxY });
      elements.ambient.append(svgElement("line", {
        x1: start.x, y1: start.y, x2: end.x, y2: end.y,
        class: x === 0 ? "axis-line" : "grid-line",
      }));
      if (x !== 0 && x % 2 === 0) {
        const label = svgElement("text", { x: start.x, y: toSvg({ x: 0, y: 0 }).y + 22, class: "grid-label", "text-anchor": "middle" });
        label.textContent = x;
        elements.ambient.append(label);
      }
    }
    for (let y = GRID.minY; y <= GRID.maxY; y += 1) {
      const start = toSvg({ x: GRID.minX, y });
      const end = toSvg({ x: GRID.maxX, y });
      elements.ambient.append(svgElement("line", {
        x1: start.x, y1: start.y, x2: end.x, y2: end.y,
        class: y === 0 ? "axis-line" : "grid-line",
      }));
      if (y !== 0 && y % 2 === 0) {
        const label = svgElement("text", { x: toSvg({ x: 0, y: 0 }).x - 13, y: start.y + 4, class: "grid-label", "text-anchor": "end" });
        label.textContent = y;
        elements.ambient.append(label);
      }
    }
    const xArrow = toSvg({ x: GRID.maxX, y: 0 });
    const yArrow = toSvg({ x: 0, y: GRID.maxY });
    elements.ambient.append(svgElement("path", { d: `M${xArrow.x} ${xArrow.y}l-14 -7v14z`, class: "axis-arrow" }));
    elements.ambient.append(svgElement("path", { d: `M${yArrow.x} ${yArrow.y}l-7 14h14z`, class: "axis-arrow" }));
    const xLabel = svgElement("text", { x: xArrow.x - 2, y: xArrow.y - 13, class: "axis-label", "text-anchor": "end" });
    xLabel.textContent = "x";
    const yLabel = svgElement("text", { x: yArrow.x + 15, y: yArrow.y + 9, class: "axis-label" });
    yLabel.textContent = "y";
    elements.ambient.append(xLabel, yLabel);
    renderKeyboardCursor();
  }

  function renderKeyboardCursor() {
    elements.ambient.querySelector(".keyboard-cursor")?.remove();
    const pos = toSvg(state.keyboardCursor);
    elements.ambient.append(svgElement("circle", { cx: pos.x, cy: pos.y, r: 13, class: "keyboard-cursor" }));
  }

  function renderDrawing() {
    elements.lines.replaceChildren();
    elements.stars.replaceChildren();
    state.edges.forEach(([a, b]) => {
      const p1 = toSvg(state.points[a]);
      const p2 = toSvg(state.points[b]);
      elements.lines.append(svgElement("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, class: "user-line" }));
    });
    state.points.forEach((point, index) => {
      const pos = toSvg(point);
      const group = svgElement("g", { class: `user-point${index === state.active ? " is-active" : ""}${state.selected.has(index) ? " is-marked" : ""}`, "data-index": index });
      group.append(svgElement("circle", { cx: pos.x, cy: pos.y, r: 22, class: "point-hit" }));
      group.append(svgElement("circle", { cx: pos.x, cy: pos.y, r: 7, class: "point-core" }));
      const label = svgElement("text", { x: pos.x + 13, y: pos.y - 12, class: "point-label" });
      label.textContent = `(${formatNumber(point.x)}; ${formatNumber(point.y)})`;
      group.append(label);
      elements.stars.append(group);
    });
    elements.count.textContent = pluralize(state.edges.length, "линия", "линии", "линий");
    elements.pen.innerHTML = `<i></i>${state.active === null ? "Линия не начата" : ` Продолжение из точки ${state.active + 1}`}`;
    elements.pen.classList.toggle("is-live", state.active !== null);
    elements.undoButton.disabled = state.history.length === 0;
    elements.clearButton.disabled = state.points.length === 0;
    elements.liftButton.disabled = state.active === null;
  }

  function pluralize(value, one, few, many) {
    const mod10 = value % 10;
    const mod100 = value % 100;
    const word = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
    return `${value} ${word}`;
  }

  function snapshot() {
    state.history.push({ points: state.points.map((p) => ({ ...p })), edges: state.edges.map((e) => [...e]), active: state.active });
    if (state.history.length > 100) state.history.shift();
  }

  function restore(snapshotState) {
    state.points = snapshotState.points;
    state.edges = snapshotState.edges;
    state.active = snapshotState.active;
    renderDrawing();
  }

  function nearestPoint(gridPoint, thresholdPixels = 25) {
    const click = toSvg(gridPoint);
    const rect = elements.svg.getBoundingClientRect();
    const scaleX = rect.width / 1000;
    const scaleY = rect.height / 680;
    let best = { index: -1, distance: Infinity };
    state.points.forEach((point, index) => {
      const pos = toSvg(point);
      const distance = Math.hypot((pos.x - click.x) * scaleX, (pos.y - click.y) * scaleY);
      if (distance < best.distance) best = { index, distance };
    });
    return best.distance <= thresholdPixels ? best.index : -1;
  }

  function addGridPoint(gridPoint) {
    if (state.phase === "identify") {
      const index = nearestPoint(gridPoint, 32);
      if (index >= 0) toggleIdentification(index);
      return;
    }
    snapshot();
    let target = nearestPoint(gridPoint);
    if (target < 0) {
      target = state.points.length;
      state.points.push(gridPoint);
    }
    if (state.active !== null && state.active !== target) {
      const key = edgeKey(state.active, target);
      if (!state.edges.some(([a, b]) => edgeKey(a, b) === key)) state.edges.push([state.active, target]);
    }
    state.active = target;
    setStatus(`Точка ${target + 1}: (${formatNumber(state.points[target].x)}; ${formatNumber(state.points[target].y)}).`, "");
    renderDrawing();
  }

  function pointerToGrid(event) {
    const rect = elements.svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1000;
    const y = ((event.clientY - rect.top) / rect.height) * 680;
    return fromSvg(x, y);
  }

  function setStatus(message, tone = "") {
    elements.status.textContent = message;
    elements.status.className = `status-text${tone ? ` is-${tone}` : ""}`;
  }

  function showReferenceEdges(count) {
    elements.answer.replaceChildren();
    state.item.edges.slice(0, count).forEach(([a, b]) => {
      const [p1, p2] = fitReference([state.item.points[a], state.item.points[b]]);
      elements.answer.append(svgElement("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, class: "answer-line" }));
    });
  }

  function fitReference(points) {
    const all = state.item.points;
    const xs = all.map((p) => p.x);
    const ys = all.map((p) => p.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const spanX = Math.max(...xs) - Math.min(...xs) || 1;
    const spanY = Math.max(...ys) - Math.min(...ys) || 1;
    const scale = Math.min(24 / spanX, 17 / spanY, 1.45);
    return points.map((p) => toSvg({ x: (p.x - centerX) * scale, y: (p.y - centerY) * scale }));
  }

  function showHint() {
    if (state.hintCount >= state.item.edges.length) {
      setStatus("Вся схема уже показана серым пунктиром.", "");
      return;
    }
    state.hintCount += 1;
    showReferenceEdges(state.hintCount);
    const [a, b] = state.item.edges[state.hintCount - 1];
    elements.hints.replaceChildren();
    const [p1, p2] = fitReference([state.item.points[a], state.item.points[b]]);
    elements.hints.append(svgElement("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, class: "hint-line" }));
    const from = state.item.points[a];
    const to = state.item.points[b];
    const coordinates = state.item.source === "teacher-document"
      ? ` Отрезок: (${formatNumber(from.x)}; ${formatNumber(from.y)}) → (${formatNumber(to.x)}; ${formatNumber(to.y)}).`
      : " Повторите его форму в любом повороте.";
    setStatus(`Шаг ${state.hintCount} из ${state.item.edges.length}.${coordinates}`, "");
  }

  function normalized(values) {
    const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1) || 1;
    return values.map((value) => value / mean).sort((a, b) => a - b);
  }

  function degreeSequence(nodeCount, edges) {
    const degrees = Array(nodeCount).fill(0);
    edges.forEach(([a, b]) => { degrees[a] += 1; degrees[b] += 1; });
    return degrees;
  }

  function edgeLengths(points, edges) {
    return edges.map(([a, b]) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y));
  }

  function pairDistances(points) {
    const values = [];
    for (let a = 0; a < points.length; a += 1) {
      for (let b = a + 1; b < points.length; b += 1) values.push(Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y));
    }
    return values;
  }

  function angleCosines(points, edges) {
    const neighbors = Array.from({ length: points.length }, () => []);
    edges.forEach(([a, b]) => { neighbors[a].push(b); neighbors[b].push(a); });
    const values = [];
    neighbors.forEach((list, center) => {
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const a = points[list[i]];
          const b = points[list[j]];
          const c = points[center];
          const v1 = { x: a.x - c.x, y: a.y - c.y };
          const v2 = { x: b.x - c.x, y: b.y - c.y };
          const denominator = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1;
          values.push((v1.x * v2.x + v1.y * v2.y) / denominator);
        }
      }
    });
    return values.sort((a, b) => a - b);
  }

  function rmse(a, b) {
    if (a.length !== b.length) return Infinity;
    return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) / Math.max(a.length, 1));
  }

  function evaluateShape() {
    const reference = state.item;
    if (state.points.length !== reference.points.length || state.edges.length !== reference.edges.length) {
      return { ok: false, reason: `Нужно ${reference.points.length} точек и ${reference.edges.length} отрезков. Сейчас ${state.points.length} и ${state.edges.length}.` };
    }
    const userDegrees = degreeSequence(state.points.length, state.edges).sort((a, b) => a - b);
    const refDegrees = degreeSequence(reference.points.length, reference.edges).sort((a, b) => a - b);
    if (userDegrees.some((value, index) => value !== refDegrees[index])) return { ok: false, reason: "Связи между точками отличаются от эталона." };

    const edgeError = rmse(normalized(edgeLengths(state.points, state.edges)), normalized(edgeLengths(reference.points, reference.edges)));
    const distanceError = rmse(normalized(pairDistances(state.points)), normalized(pairDistances(reference.points)));
    const angleError = rmse(angleCosines(state.points, state.edges), angleCosines(reference.points, reference.edges));
    const score = edgeError * .45 + distanceError * .35 + angleError * .2;
    return score <= .24
      ? { ok: true, score }
      : { ok: false, reason: "Количество точек верное, но пропорции или углы заметно отличаются. Поворот и размер не влияют на проверку." };
  }

  function check() {
    if (state.phase === "draw") {
      const result = evaluateShape();
      if (!result.ok) {
        state.failedChecks += 1;
        setStatus(`${result.reason}${state.failedChecks >= 3 ? " Можно открыть следующий шаг подсказки." : ""}`, "error");
        return;
      }
      enterIdentifyPhase();
      return;
    }
    checkIdentification();
  }

  function enterIdentifyPhase() {
    state.phase = "identify";
    state.active = null;
    elements.phases[0].className = "phase is-complete";
    elements.phases[1].className = "phase is-active";
    elements.checkButton.textContent = state.item.kind === "asterism" ? "Проверить вершины" : "Проверить звезду";
    elements.hintButton.disabled = true;
    elements.liftButton.disabled = true;
    elements.undoButton.disabled = true;
    elements.clearButton.disabled = true;
    elements.instruction.textContent = state.item.kind === "asterism"
      ? "Отметьте все три вершины. После проверки появятся названия звёзд и созвездий."
      : "Нажмите на точку, в которой находится альфа-звезда созвездия.";
    setStatus(state.item.kind === "asterism" ? "Выбрано вершин: 0 из 3." : "Выберите одну точку.", "success");
    renderDrawing();
  }

  function toggleIdentification(index) {
    if (state.item.kind === "asterism") {
      if (state.selected.has(index)) state.selected.delete(index);
      else state.selected.add(index);
      setStatus(`Выбрано вершин: ${state.selected.size} из 3.`, "");
    } else {
      state.selected.clear();
      state.selected.add(index);
      setStatus(`Выбрана точка ${index + 1}. Нажмите «Проверить звезду».`, "");
    }
    renderDrawing();
  }

  function nodeSignature(points, index) {
    const distances = points.map((point, other) => other === index ? null : Math.hypot(point.x - points[index].x, point.y - points[index].y)).filter((value) => value !== null);
    return normalized(distances);
  }

  function alphaCandidate() {
    const referenceIndex = state.item.alphaIndex;
    const refDegrees = degreeSequence(state.item.points.length, state.item.edges);
    const userDegrees = degreeSequence(state.points.length, state.edges);
    const targetSignature = nodeSignature(state.item.points, referenceIndex);
    const candidates = state.points.map((_, index) => index).filter((index) => userDegrees[index] === refDegrees[referenceIndex]);
    return candidates.sort((a, b) => rmse(nodeSignature(state.points, a), targetSignature) - rmse(nodeSignature(state.points, b), targetSignature))[0];
  }

  function checkIdentification() {
    if (state.item.kind === "asterism") {
      if (state.selected.size !== 3) {
        setStatus("Нужно отметить все три вершины треугольника.", "error");
        return;
      }
      finishRound();
      return;
    }
    if (state.selected.size !== 1) {
      setStatus("Сначала выберите одну точку.", "error");
      return;
    }
    const selected = [...state.selected][0];
    const expected = alphaCandidate();
    if (selected !== expected) {
      state.failedChecks += 1;
      elements.stars.querySelector(`[data-index="${selected}"]`)?.classList.add("is-wrong");
      setStatus("Это другая звезда. Попробуйте ещё раз.", "error");
      return;
    }
    elements.stars.querySelector(`[data-index="${selected}"]`)?.classList.add("is-alpha");
    finishRound();
  }

  function answerMarkup() {
    if (state.item.kind === "asterism") {
      return state.item.vertices.map((vertex) => `<p><b>${vertex.star}</b>, ${vertex.constellation}</p>`).join("");
    }
    return `<p><b>${state.item.alpha}</b> <span>${state.item.alphaDesignation}</span></p>`;
  }

  function finishRound() {
    const clean = state.failedChecks === 0 && state.hintCount === 0 && !state.fullAnswer;
    state.stats.streak = clean ? state.stats.streak + 1 : 0;
    if (clean && !state.stats.mastered.includes(state.item.id)) state.stats.mastered.push(state.item.id);
    saveStats();
    elements.resultLabel.textContent = clean ? "Без подсказок" : "Задание завершено";
    elements.resultTitle.textContent = clean ? "Точно" : "Готово";
    elements.resultText.textContent = clean
      ? "Форма совпала, а ключевая звезда отмечена верно."
      : "Схема разобрана. Повторите её позже без подсказки, чтобы закрепить.";
    elements.answerFact.innerHTML = answerMarkup();
    elements.resultPanel.hidden = false;
    elements.nextButton.focus();
  }

  function revealAnswer() {
    state.fullAnswer = true;
    state.hintCount = state.item.edges.length;
    showReferenceEdges(state.hintCount);
    elements.hints.replaceChildren();
    elements.answerButton.textContent = "Ответ показан";
    elements.answerButton.disabled = true;
    setStatus("Эталон показан серым пунктиром. Его можно перенести, повернуть или отразить.", "");
  }

  function undo() {
    const previous = state.history.pop();
    if (previous) restore(previous);
  }

  function clearDrawing() {
    if (!state.points.length) return;
    snapshot();
    state.points = [];
    state.edges = [];
    state.active = null;
    setStatus("Поле очищено. Поставьте первую точку.", "");
    renderDrawing();
  }

  function loadNext() {
    if (state.deckPosition >= state.deck.length) {
      state.deck = shuffle([...objects.keys()]);
      state.deckPosition = 0;
    }
    state.item = objects[state.deck[state.deckPosition]];
    state.deckPosition += 1;
    state.phase = "draw";
    state.points = [];
    state.edges = [];
    state.active = null;
    state.selected = new Set();
    state.hintCount = 0;
    state.failedChecks = 0;
    state.fullAnswer = false;
    state.history = [];
    state.keyboardCursor = { x: 0, y: 0 };
    elements.title.textContent = state.item.name;
    elements.title.classList.toggle("is-long", state.item.name.length > 17);
    elements.type.textContent = state.item.kind === "asterism" ? "Звёздный треугольник" : state.item.source === "teacher-document" ? "Схема из задания" : "Созвездие";
    elements.round.textContent = state.deckPosition;
    elements.phaseTwoLabel.textContent = state.item.kind === "asterism" ? "Назовите вершины" : "Найдите α-звезду";
    elements.phases[0].className = "phase is-active";
    elements.phases[1].className = "phase";
    elements.instruction.textContent = "Ставьте точки на координатной сетке. Следующее нажатие автоматически соединит их отрезком.";
    elements.checkButton.textContent = "Проверить схему";
    elements.hintButton.disabled = false;
    elements.answerButton.disabled = false;
    elements.answerButton.textContent = "Показать ответ";
    elements.resultPanel.hidden = true;
    elements.answer.replaceChildren();
    elements.hints.replaceChildren();
    setStatus("Поставьте первую точку. Поворот, отражение и размер могут отличаться.", "");
    drawGrid();
    renderDrawing();
  }

  elements.sky.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    addGridPoint(pointerToGrid(event));
  });
  elements.hintButton.addEventListener("click", showHint);
  elements.checkButton.addEventListener("click", check);
  elements.liftButton.addEventListener("click", () => { state.active = null; setStatus("Линия оторвана. Выберите начало следующего отрезка.", ""); renderDrawing(); });
  elements.undoButton.addEventListener("click", undo);
  elements.clearButton.addEventListener("click", clearDrawing);
  elements.answerButton.addEventListener("click", revealAnswer);
  elements.nextButton.addEventListener("click", loadNext);

  document.addEventListener("keydown", (event) => {
    if (!elements.resultPanel.hidden && event.key === "Escape") return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); undo(); return; }
    if (event.key === "Escape" && state.phase === "draw") { state.active = null; renderDrawing(); return; }
    if (event.key === "Enter" && document.activeElement !== elements.sky) { check(); return; }
    if (document.activeElement !== elements.sky) return;
    const step = event.shiftKey ? 2 : .5;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowLeft") state.keyboardCursor.x = Math.max(GRID.minX, state.keyboardCursor.x - step);
    if (event.key === "ArrowRight") state.keyboardCursor.x = Math.min(GRID.maxX, state.keyboardCursor.x + step);
    if (event.key === "ArrowUp") state.keyboardCursor.y = Math.min(GRID.maxY, state.keyboardCursor.y + step);
    if (event.key === "ArrowDown") state.keyboardCursor.y = Math.max(GRID.minY, state.keyboardCursor.y - step);
    if (event.key === "Enter" || event.key === " ") addGridPoint({ ...state.keyboardCursor });
    renderKeyboardCursor();
  });

  saveStats();
  loadNext();
})();
