(() => {
  "use strict";

  const baseObjects = window.CONSTELLATIONS.map((item) => structuredClone(item));
  const REFERENCE_STORAGE_KEY = "astra-reference-overrides-v1";

  function validReferenceOverride(value) {
    if (!value || !Array.isArray(value.points) || !Array.isArray(value.edges)) return false;
    if (value.points.length < 2 || value.points.length > 40 || value.edges.length < 1 || value.edges.length > 80) return false;
    if (!value.points.every((point) => Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= -16 && point.x <= 16 && point.y >= -16 && point.y <= 16)) return false;
    if (new Set(value.points.map((point) => `${point.x}:${point.y}`)).size !== value.points.length) return false;
    if (value.alphaIndex !== undefined && (!Number.isInteger(value.alphaIndex) || value.alphaIndex < 0 || value.alphaIndex >= value.points.length)) return false;
    const edgeKeys = new Set();
    return value.edges.every((edge) => {
      if (!Array.isArray(edge) || edge.length !== 2 || !edge.every((index) => Number.isInteger(index) && index >= 0 && index < value.points.length) || edge[0] === edge[1]) return false;
      const key = [...edge].sort((a, b) => a - b).join(":");
      if (edgeKeys.has(key)) return false;
      edgeKeys.add(key);
      return true;
    });
  }

  function readReferenceOverrides() {
    try {
      const stored = JSON.parse(localStorage.getItem(REFERENCE_STORAGE_KEY) || "{}");
      return Object.fromEntries(Object.entries(stored).filter(([, value]) => validReferenceOverride(value)));
    } catch {
      return {};
    }
  }

  const referenceOverrides = readReferenceOverrides();
  const objects = baseObjects.map((item) => {
    const custom = referenceOverrides[item.id];
    if (!custom) return structuredClone(item);
    return { ...structuredClone(item), ...structuredClone(custom), customReference: true };
  });
  const GRID = { minX: -16, maxX: 16, minY: -16, maxY: 16, left: 200, right: 800, top: 40, bottom: 640 };
  const SVG_NS = "http://www.w3.org/2000/svg";

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    title: $("#taskTitle"),
    type: $("#taskType"),
    round: $("#roundIndex"),
    roundTotal: $("#roundTotal"),
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
    guides: $("#guideLayer"),
    hints: $("#hintLayer"),
    stars: $("#starLayer"),
    hintButton: $("#hintButton"),
    undoButton: $("#undoButton"),
    clearButton: $("#clearButton"),
    doneButton: $("#doneButton"),
    answerButton: $("#answerButton"),
    skipButton: $("#skipButton"),
    resultPanel: $("#resultPanel"),
    resultLabel: $("#resultLabel"),
    resultTitle: $("#resultTitle"),
    resultText: $("#resultText"),
    answerFact: $("#answerFact"),
    nextButton: $("#nextButton"),
    streak: $("#streakValue"),
    mastered: $("#masteredValue"),
    expandButton: $("#expandButton"),
    workspace: $("#workspace"),
    skyPanel: $(".sky-panel"),
    coordinateStatus: $("#coordinateStatus"),
    drawingDescription: $("#drawingDescription"),
    coordinateForm: $("#coordinateForm"),
    coordinateX: $("#coordinateX"),
    coordinateY: $("#coordinateY"),
    coordinateError: $("#coordinateError"),
    addCoordinateButton: $("#addCoordinateButton"),
    pointCounter: $("#pointCounter"),
    sourceLink: $("#sourceLink"),
    feedbackToast: $("#feedbackToast"),
    feedbackTitle: $("#feedbackTitle"),
    feedbackText: $("#feedbackText"),
    resultTimer: $("#resultTimer"),
    guideButton: $("#guideButton"),
    guideDialog: $("#guideDialog"),
    guideClose: $("#guideClose"),
    guideStart: $("#guideStart"),
    settingsButton: $("#settingsButton"),
    settingsDialog: $("#settingsDialog"),
    settingsClose: $("#settingsClose"),
    referenceSelect: $("#referenceSelect"),
    referenceObjects: $("#referenceObjects"),
    referenceTitle: $("#referenceTitle"),
    referenceState: $("#referenceState"),
    referenceCount: $("#referenceCount"),
    referenceSky: $("#referenceSky"),
    referenceSvg: $("#referenceSvg"),
    referenceGrid: $("#referenceGrid"),
    referenceLines: $("#referenceLines"),
    referenceStars: $("#referenceStars"),
    referenceHelp: $("#referenceHelp"),
    referenceUndo: $("#referenceUndo"),
    referenceClear: $("#referenceClear"),
    referenceAlpha: $("#referenceAlpha"),
    referenceReset: $("#referenceReset"),
    referenceSave: $("#referenceSave"),
    referenceMessage: $("#referenceMessage"),
    demoCaption: $("#demoCaption"),
    demoCursor: $(".demo-cursor"),
    demoActionButton: $(".demo-button--done"),
    demoStars: [...document.querySelectorAll(".demo-star")],
    demoEdges: [...document.querySelectorAll(".demo-edge")],
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
    chainStart: null,
    chainEdges: 0,
    branchArmed: false,
    selected: new Set(),
    hintCount: 0,
    hintPoints: new Set(),
    hintEdges: new Set(),
    failedChecks: 0,
    fullAnswer: false,
    history: [],
    keyboardCursor: { x: 0, y: 0 },
    stats: readStats(),
    previousFocus: null,
    wrongIndices: new Set(),
    newEdgeKey: null,
    autoCheckTimer: null,
    toastTimer: null,
    resultTimeout: null,
    resultInterval: null,
    guideTimer: null,
    guideFrame: 0,
    lastSimilarity: null,
    shapeMapping: null,
  };

  const GUIDE_POINTS = [[240, 155], [370, 155], [350, 260], [255, 260], [150, 140], [70, 160]];
  const GUIDE_DONE = [116, 22];
  const SCHEMATIC_PASS_PERCENT = 85;
  const editor = {
    itemIndex: 0,
    points: [],
    edges: [],
    active: null,
    chainStart: null,
    chainEdges: 0,
    branchArmed: false,
    alphaIndex: null,
    alphaMode: false,
    history: [],
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
      const stored = JSON.parse(localStorage.getItem("astra-stats"));
      if (!stored || !Number.isInteger(stored.streak) || !Array.isArray(stored.mastered)) throw new Error("invalid stats");
      return {
        streak: Math.max(0, Math.min(stored.streak, 100000)),
        mastered: [...new Set(stored.mastered.filter((id) => objects.some((item) => item.id === id)))],
      };
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
      x: Math.max(GRID.minX, Math.min(GRID.maxX, Math.round(gx))),
      y: Math.max(GRID.minY, Math.min(GRID.maxY, Math.round(gy))),
    };
  }

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
  }

  function saveReferenceOverrides() {
    try { localStorage.setItem(REFERENCE_STORAGE_KEY, JSON.stringify(referenceOverrides)); } catch { /* private mode */ }
  }

  function editorSnapshot() {
    editor.history.push({
      points: structuredClone(editor.points),
      edges: structuredClone(editor.edges),
      active: editor.active,
      chainStart: editor.chainStart,
      chainEdges: editor.chainEdges,
      branchArmed: editor.branchArmed,
      alphaIndex: editor.alphaIndex,
    });
    if (editor.history.length > 60) editor.history.shift();
  }

  function editorMessage(text, tone = "") {
    elements.referenceMessage.textContent = text;
    elements.referenceMessage.className = `reference-message${tone ? ` is-${tone}` : ""}`;
  }

  function renderReferenceGrid() {
    if (elements.referenceGrid.childElementCount) return;
    for (let value = -16; value <= 16; value += 1) {
      const vertical = toSvg({ x: value, y: 0 }).x;
      const horizontal = toSvg({ x: 0, y: value }).y;
      const major = value % 4 === 0;
      elements.referenceGrid.append(
        svgElement("line", { x1: vertical, y1: GRID.top, x2: vertical, y2: GRID.bottom, class: value === 0 ? "reference-axis" : major ? "reference-grid-major" : "reference-grid-minor" }),
        svgElement("line", { x1: GRID.left, y1: horizontal, x2: GRID.right, y2: horizontal, class: value === 0 ? "reference-axis" : major ? "reference-grid-major" : "reference-grid-minor" }),
      );
    }
  }

  function renderReferenceEditor() {
    renderReferenceGrid();
    elements.referenceLines.replaceChildren();
    elements.referenceStars.replaceChildren();
    editor.edges.forEach(([a, b]) => {
      if (!editor.points[a] || !editor.points[b]) return;
      const from = toSvg(editor.points[a]);
      const to = toSvg(editor.points[b]);
      elements.referenceLines.append(svgElement("line", { x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: "reference-line" }));
    });
    editor.points.forEach((point, index) => {
      const position = toSvg(point);
      const group = svgElement("g", { class: `reference-star${editor.active === index ? " is-active" : ""}${editor.alphaIndex === index ? " is-alpha" : ""}`, "data-index": index });
      group.append(
        svgElement("circle", { cx: position.x, cy: position.y, r: 30 }),
        svgElement("circle", { cx: position.x, cy: position.y, r: 8 }),
      );
      const label = svgElement("text", { x: position.x + 13, y: position.y - 12 });
      label.textContent = `${index + 1}`;
      group.append(label);
      elements.referenceStars.append(group);
    });
    elements.referenceCount.textContent = `${editor.points.length} точек · ${editor.edges.length} линий`;
    elements.referenceUndo.disabled = editor.history.length === 0;
    elements.referenceAlpha.disabled = objects[editor.itemIndex]?.kind === "asterism" || editor.points.length === 0;
    elements.referenceAlpha.textContent = editor.alphaMode ? "Выберите α на поле" : "Указать α-звезду";
    elements.referenceHelp.classList.toggle("is-alpha", editor.alphaMode);
    elements.referenceHelp.textContent = editor.alphaMode
      ? "Нажмите точку, которая должна считаться α-звездой."
      : "Нажмите любую готовую точку — она станет активной. Следующая точка продолжит линию именно из неё.";
  }

  function rebuildReferenceList() {
    elements.referenceSelect.replaceChildren();
    elements.referenceObjects.replaceChildren();
    objects.forEach((item, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = item.name;
      elements.referenceSelect.append(option);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `reference-object${index === editor.itemIndex ? " is-active" : ""}${referenceOverrides[item.id] ? " is-custom" : ""}`;
      const name = document.createElement("span");
      name.textContent = item.name;
      const status = document.createElement("small");
      status.textContent = referenceOverrides[item.id] ? "Свой" : "Wiki";
      button.append(name, status);
      button.addEventListener("click", () => loadReferenceEditor(index));
      elements.referenceObjects.append(button);
    });
    elements.referenceSelect.value = String(editor.itemIndex);
  }

  function loadReferenceEditor(index) {
    editor.itemIndex = Math.max(0, Math.min(objects.length - 1, Number(index) || 0));
    const item = objects[editor.itemIndex];
    editor.points = structuredClone(item.points);
    editor.edges = structuredClone(item.edges);
    editor.active = null;
    editor.chainStart = null;
    editor.chainEdges = 0;
    editor.branchArmed = false;
    editor.alphaIndex = item.kind === "constellation" ? item.alphaIndex : null;
    editor.alphaMode = false;
    editor.history = [];
    elements.referenceTitle.textContent = item.name;
    elements.referenceState.textContent = referenceOverrides[item.id] ? "Ваш сохранённый эталон" : "Эталон Wikipedia / Wikimedia";
    editorMessage("");
    rebuildReferenceList();
    renderReferenceEditor();
  }

  function referencePointFromEvent(event) {
    const rect = elements.referenceSvg.getBoundingClientRect();
    return fromSvg((event.clientX - rect.left) * 1000 / rect.width, (event.clientY - rect.top) * 680 / rect.height);
  }

  function handleReferencePointer(event) {
    const point = referencePointFromEvent(event);
    const existing = editor.points.findIndex((candidate) => candidate.x === point.x && candidate.y === point.y);
    if (editor.alphaMode) {
      if (existing < 0) return editorMessage("Для α-звезды выберите уже поставленную точку.", "error");
      editorSnapshot();
      editor.alphaIndex = existing;
      editor.alphaMode = false;
      editorMessage(`α-звезда назначена точке ${existing + 1}.`, "success");
      renderReferenceEditor();
      return;
    }
    if (existing >= 0) {
      if (editor.active === existing) {
        editorSnapshot();
        editor.active = null;
        editor.chainStart = null;
        editor.chainEdges = 0;
        editor.branchArmed = false;
        editorMessage(`Точка ${existing + 1} снята с выбора.`);
      } else if (editor.active === null) {
        editorSnapshot();
        editor.active = existing;
        editor.chainStart = existing;
        editor.chainEdges = 0;
        editor.branchArmed = true;
        editorMessage(`Выбрана точка ${existing + 1}. Продолжайте линию из неё.`);
      } else if (editor.branchArmed || (existing === editor.chainStart && editor.chainEdges >= 2)) {
        editorSnapshot();
        const key = edgeKey(editor.active, existing);
        if (!editor.edges.some(([a, b]) => edgeKey(a, b) === key)) editor.edges.push([editor.active, existing]);
        const closedContour = existing === editor.chainStart && editor.chainEdges >= 2;
        editor.chainEdges += 1;
        editor.branchArmed = false;
        editor.active = closedContour ? null : existing;
        if (closedContour) {
          editor.chainStart = null;
          editor.chainEdges = 0;
          editorMessage("Контур замкнут. Выберите любую вершину для новой ветви.");
        } else {
          editorMessage(`Линия продолжена до точки ${existing + 1}.`);
        }
      } else {
        editorSnapshot();
        editor.active = existing;
        editor.chainStart = existing;
        editor.chainEdges = 0;
        editor.branchArmed = true;
        editorMessage(`Активная вершина переключена на точку ${existing + 1}.`);
      }
    } else {
      editorSnapshot();
      const index = editor.points.push(point) - 1;
      if (editor.active !== null) {
        editor.edges.push([editor.active, index]);
        editor.chainEdges += 1;
      } else {
        editor.chainStart = index;
        editor.chainEdges = 0;
      }
      editor.active = index;
      editor.branchArmed = false;
      editorMessage(`Поставлена точка ${index + 1}.`);
    }
    renderReferenceEditor();
  }

  function undoReferenceEdit() {
    const previous = editor.history.pop();
    if (!previous) return;
    editor.points = previous.points;
    editor.edges = previous.edges;
    editor.active = previous.active;
    editor.chainStart = previous.chainStart;
    editor.chainEdges = previous.chainEdges;
    editor.branchArmed = previous.branchArmed;
    editor.alphaIndex = previous.alphaIndex;
    editor.alphaMode = false;
    editorMessage("Последнее действие отменено.");
    renderReferenceEditor();
  }

  function clearReferenceEditor() {
    editorSnapshot();
    editor.points = [];
    editor.edges = [];
    editor.active = null;
    editor.chainStart = null;
    editor.chainEdges = 0;
    editor.branchArmed = false;
    editor.alphaIndex = null;
    editor.alphaMode = false;
    editorMessage("Поле очищено. Поставьте первую точку.");
    renderReferenceEditor();
  }

  function saveReferenceEditor() {
    const item = objects[editor.itemIndex];
    const candidate = { points: structuredClone(editor.points), edges: structuredClone(editor.edges) };
    if (!validReferenceOverride(candidate)) return editorMessage("Нужно поставить не менее двух точек и соединить хотя бы одну пару.", "error");
    if (item.kind === "constellation" && (!Number.isInteger(editor.alphaIndex) || !editor.points[editor.alphaIndex])) {
      return editorMessage("Перед сохранением укажите α-звезду.", "error");
    }
    candidate.alphaIndex = item.kind === "constellation" ? editor.alphaIndex : undefined;
    candidate.pointNames = editor.points.map((_, index) => item.kind === "constellation" && index === editor.alphaIndex ? item.alpha : `Звезда №${index + 1}`);
    referenceOverrides[item.id] = candidate;
    saveReferenceOverrides();
    Object.assign(item, structuredClone(candidate), { customReference: true });
    elements.referenceState.textContent = "Ваш сохранённый эталон";
    rebuildReferenceList();
    editorMessage("Эталон сохранён. Следующая проверка использует эту схему.", "success");
    if (state.item?.id === item.id) {
      state.item = item;
      clearDrawing();
      elements.sourceLink.textContent = "Эталон изменён в настройках";
    }
  }

  function resetReferenceEditor() {
    const item = objects[editor.itemIndex];
    const original = structuredClone(baseObjects.find((candidate) => candidate.id === item.id));
    delete referenceOverrides[item.id];
    saveReferenceOverrides();
    Object.keys(item).forEach((key) => delete item[key]);
    Object.assign(item, original);
    loadReferenceEditor(editor.itemIndex);
    editorMessage("Возвращён исходный эталон Wikipedia / Wikimedia.", "success");
    if (state.item?.id === item.id) {
      state.item = item;
      clearDrawing();
    }
  }

  function openReferenceSettings() {
    const currentIndex = Math.max(0, objects.findIndex((item) => item.id === state.item?.id));
    loadReferenceEditor(currentIndex);
    elements.settingsDialog.showModal();
  }

  function fitTaskTitle() {
    elements.title.style.removeProperty("font-size");
    if (/\s/.test(elements.title.textContent.trim())) return;
    requestAnimationFrame(() => {
      let size = Number.parseFloat(getComputedStyle(elements.title).fontSize);
      const minimum = matchMedia("(max-width: 720px)").matches ? 30 : 34;
      while (elements.title.scrollWidth > elements.title.clientWidth && size > minimum) {
        size -= 1;
        elements.title.style.fontSize = `${size}px`;
      }
    });
  }

  function resetGuideDemo() {
    elements.demoStars.forEach((star) => star.classList.remove("is-visible"));
    elements.demoStars.forEach((star) => star.classList.remove("is-active"));
    elements.demoEdges.forEach((edge) => edge.classList.remove("is-visible"));
    elements.demoActionButton.classList.remove("is-demo-pressed");
    elements.demoCursor.classList.remove("is-clicking");
    elements.demoCursor.style.transform = `translate(${GUIDE_POINTS[0][0]}px, ${GUIDE_POINTS[0][1]}px)`;
    elements.demoCaption.textContent = "Сначала поставьте первую точку";
  }

  function stopGuideDemo() {
    clearTimeout(state.guideTimer);
    state.guideTimer = null;
  }

  function guideFrames() {
    const frames = [{ reset: true, delay: 850 }];
    GUIDE_POINTS.slice(0, 4).forEach((point, index) => {
      frames.push({ cursor: point, click: true, star: index, activate: index, edge: index > 0 ? index - 1 : null, label: index === 0 ? "Первая точка становится активной" : "Новая точка соединяется с активной", delay: 780 });
    });
    frames.push({ cursor: GUIDE_POINTS[0], click: true, edge: 3, deactivate: true, label: "Нажатие первой точки замыкает контур", delay: 760 });
    frames.push({ cursor: GUIDE_POINTS[0], activate: 0, click: true, label: "Нажмите вершину ещё раз — начните новую ветвь", delay: 900 });
    GUIDE_POINTS.slice(4).forEach((point, offset) => {
      const index = offset + 4;
      frames.push({ cursor: point, click: true, star: index, activate: index, edge: index, label: "Продолжайте линию из выбранной вершины", delay: 760 });
    });
    frames.push({ cursor: GUIDE_DONE, press: "done", label: "Когда рисунок готов — нажмите «Готово»", delay: 700 });
    frames.push({ label: "Сходство 96% · форма зачтена", delay: 1400 });
    return frames;
  }

  function runGuideFrame() {
    const frames = guideFrames();
    if (state.guideFrame >= frames.length) state.guideFrame = 0;
    const frame = frames[state.guideFrame];
    elements.demoActionButton.classList.remove("is-demo-pressed");
    elements.demoCursor.classList.remove("is-clicking");
    if (frame.reset) resetGuideDemo();
    if (frame.cursor) elements.demoCursor.style.transform = `translate(${frame.cursor[0]}px, ${frame.cursor[1]}px)`;
    if (frame.star !== undefined) elements.demoStars[frame.star]?.classList.add("is-visible");
    if (frame.edge !== null && frame.edge !== undefined) elements.demoEdges[frame.edge]?.classList.add("is-visible");
    if (frame.activate !== undefined) {
      elements.demoStars.forEach((star) => star.classList.remove("is-active"));
      elements.demoStars[frame.activate]?.classList.add("is-active");
      elements.demoCursor.classList.add("is-clicking");
    }
    if (frame.deactivate) elements.demoStars.forEach((star) => star.classList.remove("is-active"));
    if (frame.press) {
      elements.demoActionButton.classList.add("is-demo-pressed");
      void elements.demoCursor.getBoundingClientRect();
      elements.demoCursor.classList.add("is-clicking");
    }
    if (frame.click) elements.demoCursor.classList.add("is-clicking");
    if (frame.label) elements.demoCaption.textContent = frame.label;
    state.guideFrame += 1;
    state.guideTimer = setTimeout(runGuideFrame, frame.delay);
  }

  function startGuideDemo() {
    stopGuideDemo();
    state.guideFrame = 0;
    resetGuideDemo();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.demoStars.forEach((star) => star.classList.add("is-visible"));
      elements.demoEdges.forEach((edge) => edge.classList.add("is-visible"));
      elements.demoCaption.textContent = "Выберите готовую вершину для новой ветви, затем нажмите «Готово»";
      return;
    }
    runGuideFrame();
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
    elements.coordinateStatus.textContent = `Курсор: x ${formatNumber(state.keyboardCursor.x)}, y ${formatNumber(state.keyboardCursor.y)}.`;
  }

  function renderDrawing() {
    elements.lines.replaceChildren();
    elements.guides.replaceChildren();
    elements.stars.replaceChildren();
    state.edges.forEach(([a, b]) => {
      const p1 = toSvg(state.points[a]);
      const p2 = toSvg(state.points[b]);
      const key = edgeKey(a, b);
      elements.lines.append(svgElement("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, pathLength: 1, class: `user-line${key === state.newEdgeKey ? " is-new" : ""}` }));
    });
    state.points.forEach((point, index) => {
      const pos = toSvg(point);
      const group = svgElement("g", { class: `user-point${index === state.active ? " is-active" : ""}${state.selected.has(index) ? " is-marked" : ""}${state.wrongIndices.has(index) ? " is-wrong" : ""}${state.phase === "identify" ? " is-ready" : ""}`, "data-index": index });
      group.append(svgElement("circle", { cx: pos.x, cy: pos.y, r: 22, class: "point-hit" }));
      group.append(svgElement("circle", { cx: pos.x, cy: pos.y, r: 7, class: "point-core" }));
      const label = svgElement("text", { x: pos.x + 13, y: pos.y - 12, class: "point-label" });
      label.textContent = `(${formatNumber(point.x)}; ${formatNumber(point.y)})`;
      group.append(label);
      elements.stars.append(group);
    });
    elements.count.textContent = pluralize(state.edges.length, "линия", "линии", "линий");
    const penDot = document.createElement("i");
    elements.pen.replaceChildren(penDot, document.createTextNode(state.active === null ? " Линия не начата" : ` Продолжение из точки ${state.active + 1}`));
    elements.pen.classList.toggle("is-live", state.active !== null);
    elements.undoButton.disabled = state.phase !== "draw" || state.history.length === 0;
    elements.clearButton.disabled = state.phase !== "draw" || state.points.length === 0;
    elements.doneButton.disabled = state.phase !== "draw";
    elements.pointCounter.textContent = pluralize(state.points.length, "точка", "точки", "точек");
    const inputDisabled = state.phase !== "draw";
    elements.coordinateX.disabled = inputDisabled;
    elements.coordinateY.disabled = inputDisabled;
    elements.addCoordinateButton.disabled = inputDisabled;
    const pointList = state.points.map((point, index) => `Точка ${index + 1}: x ${formatNumber(point.x)}, y ${formatNumber(point.y)}`).join("; ");
    elements.drawingDescription.textContent = `${pluralize(state.points.length, "Поставлена точка", "Поставлены точки", "Поставлено точек")}. ${pointList}. ${pluralize(state.edges.length, "Соединена линия", "Соединены линии", "Соединено линий")}.`;
    renderMissingConnectionGuide();
    state.newEdgeKey = null;
  }

  function referenceToUserMap() {
    if (state.points.length !== state.item.points.length) return [];
    const pairs = [];
    state.item.points.forEach((_, referenceIndex) => {
      const signature = nodeSignature(state.item.points, referenceIndex);
      state.points.forEach((__, userIndex) => {
        pairs.push({ referenceIndex, userIndex, error: rmse(signature, nodeSignature(state.points, userIndex)) });
      });
    });
    pairs.sort((a, b) => a.error - b.error);
    const mapping = Array(state.item.points.length).fill(-1);
    const usedUsers = new Set();
    pairs.forEach(({ referenceIndex, userIndex }) => {
      if (mapping[referenceIndex] < 0 && !usedUsers.has(userIndex)) {
        mapping[referenceIndex] = userIndex;
        usedUsers.add(userIndex);
      }
    });
    return mapping;
  }

  function renderMissingConnectionGuide() {
    if (state.phase !== "draw" || state.points.length !== state.item.points.length || state.edges.length >= state.item.edges.length) return;
    const mapping = referenceToUserMap();
    const missing = state.item.edges.find(([a, b]) => {
      const userA = mapping[a];
      const userB = mapping[b];
      return userA >= 0 && userB >= 0 && !state.edges.some(([x, y]) => edgeKey(x, y) === edgeKey(userA, userB));
    });
    if (!missing) return;
    const userA = mapping[missing[0]];
    const userB = mapping[missing[1]];
    const p1 = toSvg(state.points[userA]);
    const p2 = toSvg(state.points[userB]);
    elements.guides.append(svgElement("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, class: "connection-guide" }));
  }

  function pluralize(value, one, few, many) {
    const mod10 = value % 10;
    const mod100 = value % 100;
    const word = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
    return `${value} ${word}`;
  }

  function snapshot() {
    state.history.push({
      points: state.points.map((p) => ({ ...p })),
      edges: state.edges.map((e) => [...e]),
      active: state.active,
      chainStart: state.chainStart,
      chainEdges: state.chainEdges,
      branchArmed: state.branchArmed,
    });
    if (state.history.length > 100) state.history.shift();
  }

  function restore(snapshotState) {
    state.points = snapshotState.points;
    state.edges = snapshotState.edges;
    state.active = snapshotState.active;
    state.chainStart = snapshotState.chainStart ?? snapshotState.active;
    state.chainEdges = snapshotState.chainEdges ?? 0;
    state.branchArmed = snapshotState.branchArmed ?? false;
    renderDrawing();
  }

  function hasPath(start, end) {
    if (start === end) return true;
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const current = queue.shift();
      for (const [a, b] of state.edges) {
        const next = a === current ? b : b === current ? a : -1;
        if (next < 0 || visited.has(next)) continue;
        if (next === end) return true;
        visited.add(next);
        queue.push(next);
      }
    }
    return false;
  }

  function isExpectedMissingUserEdge(a, b) {
    if (state.points.length !== state.item.points.length) return false;
    const mapping = referenceToUserMap();
    return state.item.edges.some(([refA, refB]) => {
      const userA = mapping[refA];
      const userB = mapping[refB];
      return edgeKey(userA, userB) === edgeKey(a, b)
        && !state.edges.some(([x, y]) => edgeKey(x, y) === edgeKey(a, b));
    });
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
    if (!Number.isInteger(gridPoint.x) || !Number.isInteger(gridPoint.y)) {
      setStatus("Используйте только целые координаты.", "error");
      return;
    }
    state.shapeMapping = null;
    let target = state.points.findIndex((point) => point.x === gridPoint.x && point.y === gridPoint.y);
    const isNewPoint = target < 0;
    if (isNewPoint) {
      if (state.points.length >= state.item.points.length) {
        setStatus(`Для этой схемы достаточно ${state.item.points.length} точек. Нажмите готовую вершину, чтобы продолжить из неё.`, "error");
        return;
      }
      snapshot();
      target = state.points.length;
      state.points.push(gridPoint);
    } else if (state.active === target) {
      setStatus(`Точка ${target + 1} уже выбрана.`, "");
      return;
    } else {
      snapshot();
    }
    let duplicateEdge = false;
    let selectedExisting = false;
    let closedContour = false;
    if (!isNewPoint && state.active === null) {
      state.branchArmed = true;
      selectedExisting = true;
    }
    if (!isNewPoint && state.active !== null && state.active !== target) {
      const shouldConnect = (target === state.chainStart && state.chainEdges >= 2)
        || state.branchArmed
        || isExpectedMissingUserEdge(state.active, target);
      if (!shouldConnect) {
        state.active = target;
        state.chainStart = target;
        state.chainEdges = 0;
        state.branchArmed = true;
        selectedExisting = true;
      }
    }
    if (!selectedExisting && state.active !== null && state.active !== target) {
      const key = edgeKey(state.active, target);
      if (!state.edges.some(([a, b]) => edgeKey(a, b) === key)) {
        closedContour = hasPath(state.active, target);
        state.edges.push([state.active, target]);
        state.newEdgeKey = key;
        state.chainEdges += 1;
        state.branchArmed = false;
      } else {
        duplicateEdge = true;
      }
    }
    if (state.active === null || isNewPoint && state.chainStart === null) state.chainStart = target;
    if (isNewPoint) state.branchArmed = false;
    state.active = closedContour ? null : target;
    if (closedContour) {
      state.chainStart = null;
      state.chainEdges = 0;
      state.branchArmed = false;
    }
    setStatus(
      duplicateEdge ? "Этот отрезок уже соединён и учитывается один раз."
        : selectedExisting ? `Точка ${target + 1} выбрана. Следующее нажатие соединит её с новой или уже поставленной точкой.`
          : closedContour ? "Контур замкнут. Выберите любую вершину, чтобы продолжить из неё."
            : `Точка ${target + 1}: (${formatNumber(state.points[target].x)}; ${formatNumber(state.points[target].y)}).`,
      "",
    );
    renderDrawing();
    maybeAutoCheck();
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

  function showToast(title, message, tone = "success", duration = 3600) {
    clearTimeout(state.toastTimer);
    elements.feedbackTitle.textContent = title;
    elements.feedbackText.textContent = message;
    elements.feedbackToast.dataset.tone = tone;
    elements.feedbackToast.hidden = false;
    requestAnimationFrame(() => elements.feedbackToast.classList.add("is-visible"));
    state.toastTimer = setTimeout(() => {
      elements.feedbackToast.classList.remove("is-visible");
      setTimeout(() => { elements.feedbackToast.hidden = true; }, 220);
    }, duration);
  }

  function populateCoordinateLists() {
    for (let value = GRID.minX; value <= GRID.maxX; value += 1) {
      const option = document.createElement("option");
      option.value = value;
      elements.coordinateX.list.append(option);
    }
    for (let value = GRID.minY; value <= GRID.maxY; value += 1) {
      const option = document.createElement("option");
      option.value = value;
      elements.coordinateY.list.append(option);
    }
  }

  function addCoordinateFromForm(event) {
    event.preventDefault();
    const x = Number(elements.coordinateX.value);
    const y = Number(elements.coordinateY.value);
    const valid = Number.isInteger(x) && Number.isInteger(y) && x >= GRID.minX && x <= GRID.maxX && y >= GRID.minY && y <= GRID.maxY;
    if (!valid) {
      elements.coordinateError.textContent = "Введите целые X и Y от −16 до 16.";
      return;
    }
    elements.coordinateError.textContent = "";
    state.keyboardCursor = { x, y };
    renderKeyboardCursor();
    addGridPoint({ x, y });
    elements.coordinateX.focus();
    elements.coordinateX.select();
  }

  function showReferenceEdges(count) {
    elements.answer.replaceChildren();
    state.item.edges.slice(0, count).forEach(([a, b]) => {
      const [p1, p2] = [toSvg(state.item.points[a]), toSvg(state.item.points[b])];
      elements.answer.append(svgElement("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, class: "answer-line" }));
    });
  }

  function renderHints(newPoint = -1, newEdge = -1) {
    elements.hints.replaceChildren();
    state.hintEdges.forEach((edgeIndex) => {
      const [a, b] = state.item.edges[edgeIndex];
      const p1 = toSvg(state.item.points[a]);
      const p2 = toSvg(state.item.points[b]);
      elements.hints.append(svgElement("line", { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, class: `hint-line${edgeIndex === newEdge ? " is-new" : ""}` }));
    });
    state.hintPoints.forEach((index) => {
      const point = state.item.points[index];
      const pos = toSvg(point);
      elements.hints.append(svgElement("circle", { cx: pos.x, cy: pos.y, r: index === newPoint ? 12 : 8, class: `hint-point${index === newPoint ? " is-new" : ""}` }));
    });
  }

  function showHint() {
    if (state.hintPoints.size === 0) {
      const first = state.item.edges[0]?.[0] ?? 0;
      state.hintPoints.add(first);
      state.hintCount += 1;
      renderHints(first, -1);
      setStatus(`Шаг 1: поставьте точку (${state.item.points[first].x}; ${state.item.points[first].y}).`, "");
      elements.hintButton.textContent = "Показать следующий шаг";
      return;
    }

    let newPoint = -1;
    let newEdge = -1;
    for (let index = 0; index < state.item.edges.length; index += 1) {
      if (state.hintEdges.has(index)) continue;
      const [a, b] = state.item.edges[index];
      if (state.hintPoints.has(a) && state.hintPoints.has(b)) {
        state.hintEdges.add(index);
        newEdge = index;
        break;
      }
      if (state.hintPoints.has(a) || state.hintPoints.has(b)) {
        newPoint = state.hintPoints.has(a) ? b : a;
        state.hintPoints.add(newPoint);
        state.hintEdges.add(index);
        newEdge = index;
        break;
      }
    }
    if (newPoint < 0 && newEdge < 0) {
      const nextEdge = state.item.edges.findIndex((_, index) => !state.hintEdges.has(index));
      if (nextEdge >= 0) {
        newPoint = state.item.edges[nextEdge][0];
        state.hintPoints.add(newPoint);
      }
    }
    if (newPoint < 0 && newEdge < 0) {
      const isolated = state.item.points.findIndex((_, index) => !state.hintPoints.has(index));
      if (isolated >= 0) { newPoint = isolated; state.hintPoints.add(isolated); }
    }
    state.hintCount += 1;
    renderHints(newPoint, newEdge);
    const complete = state.hintPoints.size === state.item.points.length && state.hintEdges.size === state.item.edges.length;
    elements.hintButton.textContent = complete ? "Все шаги показаны" : "Показать следующий шаг";
    elements.hintButton.disabled = complete;
    if (newEdge >= 0) {
      const [a, b] = state.item.edges[newEdge];
      setStatus(`Соедините точки (${state.item.points[a].x}; ${state.item.points[a].y}) и (${state.item.points[b].x}; ${state.item.points[b].y}).`, "");
    } else if (newPoint >= 0) {
      setStatus(`Поставьте точку (${state.item.points[newPoint].x}; ${state.item.points[newPoint].y}).`, "");
    }
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

  function clampPercent(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function evaluateShape() {
    return window.ASTRA_SHAPE_MATCHER.evaluate(
      state.item,
      { points: state.points, edges: state.edges },
      SCHEMATIC_PASS_PERCENT,
    );
  }

  function maybeAutoCheck() {
    clearTimeout(state.autoCheckTimer);
    if (state.phase !== "draw" || state.points.length !== state.item.points.length || state.edges.length !== state.item.edges.length) return;
    state.autoCheckTimer = setTimeout(checkShape, 380);
  }

  function checkShape() {
    const result = evaluateShape();
    state.lastSimilarity = result.similarity;
    state.shapeMapping = result.mapping || null;
    if (!result.ok) {
      state.failedChecks += 1;
      setStatus(`${result.reason} Продолжите рисунок, отмените последний шаг или очистите поле.`, "error");
      showToast(`Сходство ${result.similarity}%`, result.reason, "error", 4200);
      return;
    }
    enterIdentifyPhase();
  }

  function enterIdentifyPhase() {
    state.phase = "identify";
    state.active = null;
    state.chainStart = null;
    state.chainEdges = 0;
    state.branchArmed = false;
    elements.phases[0].className = "phase is-complete";
    elements.phases[1].className = "phase is-active";
    elements.hintButton.disabled = true;
    elements.undoButton.disabled = true;
    elements.clearButton.disabled = true;
    elements.doneButton.disabled = true;
    elements.instruction.textContent = state.item.kind === "asterism"
      ? "Отметьте все три вершины — результат проверится автоматически."
      : "Выберите α-звезду — результат проверится сразу.";
    setStatus(state.item.kind === "asterism" ? "Выбрано вершин: 0 из 3." : "Выберите одну светящуюся точку.", "success");
    renderDrawing();
    showToast(`Сходство ${state.lastSimilarity}%`, state.item.kind === "asterism" ? "Теперь отметьте три вершины." : "Форма зачтена. Теперь выберите α-звезду.", "success", 4200);
  }

  function toggleIdentification(index) {
    if (state.item.kind === "asterism") {
      if (state.selected.has(index)) state.selected.delete(index);
      else state.selected.add(index);
      setStatus(`Выбрано вершин: ${state.selected.size} из 3.`, "");
      renderDrawing();
      if (state.selected.size === 3) finishRound();
    } else {
      state.selected.clear();
      state.selected.add(index);
      checkIdentification(index);
    }
  }

  function nodeSignature(points, index) {
    const distances = points.map((point, other) => other === index ? null : Math.hypot(point.x - points[index].x, point.y - points[index].y)).filter((value) => value !== null);
    return normalized(distances);
  }

  function alphaCandidate() {
    const referenceIndex = state.item.alphaIndex;
    const mappedIndex = state.shapeMapping?.[referenceIndex];
    if (Number.isInteger(mappedIndex) && mappedIndex >= 0) return mappedIndex;
    const refDegrees = degreeSequence(state.item.points.length, state.item.edges);
    const userDegrees = degreeSequence(state.points.length, state.edges);
    const targetSignature = nodeSignature(state.item.points, referenceIndex);
    const candidates = state.points.map((_, index) => index).filter((index) => userDegrees[index] === refDegrees[referenceIndex]);
    return candidates.sort((a, b) => rmse(nodeSignature(state.points, a), targetSignature) - rmse(nodeSignature(state.points, b), targetSignature))[0];
  }

  function referenceIndexForUser(userIndex) {
    const refDegrees = degreeSequence(state.item.points.length, state.item.edges);
    const userDegrees = degreeSequence(state.points.length, state.edges);
    const userSignature = nodeSignature(state.points, userIndex);
    const candidates = state.item.points.map((_, index) => index).filter((index) => refDegrees[index] === userDegrees[userIndex]);
    return candidates.sort((a, b) => rmse(nodeSignature(state.item.points, a), userSignature) - rmse(nodeSignature(state.item.points, b), userSignature))[0];
  }

  function checkIdentification(selected) {
    const expected = alphaCandidate();
    if (selected !== expected) {
      state.failedChecks += 1;
      state.wrongIndices.add(selected);
      setStatus(`Выбрана не «${state.item.alpha}». Попробуйте другую точку.`, "error");
      renderDrawing();
      showToast("Не та звезда", `Выбрана не «${state.item.alpha}».`, "error", 4000);
      return;
    }
    state.wrongIndices.delete(selected);
    renderDrawing();
    elements.stars.querySelector(`[data-index="${selected}"]`)?.classList.add("is-alpha");
    finishRound();
  }

  function renderAnswerFact() {
    elements.answerFact.replaceChildren();
    if (state.item.kind === "asterism") {
      state.item.vertices.forEach((vertex) => {
        const row = document.createElement("p");
        const name = document.createElement("b");
        name.textContent = vertex.star;
        row.append(name, document.createTextNode(` (${vertex.constellation})`));
        elements.answerFact.append(row);
      });
      return;
    }
    const row = document.createElement("p");
    const name = document.createElement("b");
    const designation = document.createElement("span");
    name.textContent = state.item.alpha;
    designation.textContent = ` (${state.item.alphaScientific || state.item.alphaDesignation})`;
    row.append(name, designation);
    elements.answerFact.append(row);
  }

  function finishRound() {
    clearTimeout(state.toastTimer);
    elements.feedbackToast.classList.remove("is-visible");
    elements.feedbackToast.hidden = true;
    const clean = state.failedChecks === 0 && state.hintCount === 0 && !state.fullAnswer;
    state.stats.streak = clean ? state.stats.streak + 1 : 0;
    if (clean && !state.stats.mastered.includes(state.item.id)) state.stats.mastered.push(state.item.id);
    saveStats();
    elements.resultLabel.textContent = clean ? "Без подсказок" : "Задание завершено";
    elements.resultTitle.textContent = clean ? "Точно" : "Готово";
    const similarityNote = Number.isFinite(state.lastSimilarity) ? ` Сходство — ${state.lastSimilarity}%.` : "";
    elements.resultText.textContent = clean
      ? `Форма совпала, а ключевая звезда отмечена верно.${similarityNote}`
      : `Схема разобрана. Повторите её позже без подсказки, чтобы закрепить.${similarityNote}`;
    renderAnswerFact();
    state.previousFocus = document.activeElement;
    document.querySelector(".topbar").inert = true;
    elements.workspace.inert = true;
    document.body.classList.add("modal-open");
    elements.resultPanel.hidden = false;
    elements.resultPanel.classList.remove("is-counting");
    requestAnimationFrame(() => elements.resultPanel.classList.add("is-counting"));
    let seconds = 5;
    elements.resultTimer.textContent = seconds;
    state.resultInterval = setInterval(() => {
      seconds -= 1;
      elements.resultTimer.textContent = Math.max(0, seconds);
    }, 1000);
    state.resultTimeout = setTimeout(loadNext, 5000);
    elements.nextButton.focus();
  }

  function revealAnswer() {
    state.fullAnswer = true;
    showReferenceEdges(state.item.edges.length);
    elements.hints.replaceChildren();
    elements.answerButton.textContent = "Ответ показан";
    elements.answerButton.disabled = true;
    setStatus("Эталон показан серым пунктиром. Его можно перенести, повернуть, отразить или изменить в настройках.", "");
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
    state.chainStart = null;
    state.chainEdges = 0;
    state.branchArmed = false;
    state.shapeMapping = null;
    setStatus("Поле очищено. Поставьте первую точку.", "");
    renderDrawing();
  }

  function loadNext() {
    clearTimeout(state.autoCheckTimer);
    clearTimeout(state.resultTimeout);
    clearInterval(state.resultInterval);
    clearTimeout(state.toastTimer);
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
    state.chainStart = null;
    state.chainEdges = 0;
    state.branchArmed = false;
    state.selected = new Set();
    state.hintCount = 0;
    state.hintPoints = new Set();
    state.hintEdges = new Set();
    state.failedChecks = 0;
    state.fullAnswer = false;
    state.history = [];
    state.keyboardCursor = { x: 0, y: 0 };
    state.wrongIndices = new Set();
    state.newEdgeKey = null;
    state.lastSimilarity = null;
    state.shapeMapping = null;
    elements.title.textContent = state.item.name;
    elements.title.classList.toggle("is-medium", state.item.name.length > 8 && state.item.name.length <= 14);
    elements.title.classList.toggle("is-long", state.item.name.length > 14);
    fitTaskTitle();
    elements.type.textContent = `Схематично · зачёт от ${SCHEMATIC_PASS_PERCENT}%`;
    elements.type.classList.remove("is-coordinate");
    elements.sourceLink.hidden = false;
    elements.sourceLink.href = state.item.sourceUrl || "https://commons.wikimedia.org/";
    elements.sourceLink.textContent = state.item.customReference
      ? "Ваш эталон · исходник Wikipedia"
      : state.item.kind === "asterism" ? "Источник: Wikipedia" : "Схема: Wikipedia / Wikimedia";
    elements.round.textContent = state.deckPosition;
    elements.phaseTwoLabel.textContent = state.item.kind === "asterism" ? "Назовите вершины" : "Найдите α-звезду";
    elements.phases[0].className = "phase is-active";
    elements.phases[1].className = "phase";
    elements.instruction.textContent = `Передайте форму созвездия. Поворот, отражение и масштаб свободны — зачёт от ${SCHEMATIC_PASS_PERCENT}%.`;
    elements.hintButton.disabled = false;
    elements.hintButton.replaceChildren();
    const hintPlus = document.createElement("span");
    hintPlus.setAttribute("aria-hidden", "true");
    hintPlus.textContent = "+";
    elements.hintButton.append(hintPlus, document.createTextNode(" Показать шаг"));
    elements.answerButton.disabled = false;
    elements.answerButton.textContent = "Показать ответ";
    elements.doneButton.disabled = false;
    const wasModalOpen = !elements.resultPanel.hidden;
    elements.resultPanel.hidden = true;
    elements.resultPanel.classList.remove("is-counting");
    elements.feedbackToast.hidden = true;
    elements.feedbackToast.classList.remove("is-visible");
    elements.coordinateError.textContent = "";
    document.querySelector(".topbar").inert = false;
    elements.workspace.inert = false;
    document.body.classList.remove("modal-open");
    elements.answer.replaceChildren();
    elements.hints.replaceChildren();
    setStatus("Поставьте первую точку. Нажмите готовую вершину, чтобы продолжить новую ветвь из неё.", "");
    drawGrid();
    renderDrawing();
    if (wasModalOpen) elements.sky.focus();
  }

  function toggleExpandedSky() {
    const expanded = !elements.skyPanel.classList.contains("is-expanded");
    elements.skyPanel.classList.toggle("is-expanded", expanded);
    elements.expandButton.setAttribute("aria-pressed", String(expanded));
    elements.expandButton.textContent = expanded ? "Свернуть" : "Развернуть";
    document.body.classList.toggle("sky-expanded", expanded);
    if (expanded) elements.sky.focus();
  }

  elements.sky.addEventListener("click", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    addGridPoint(pointerToGrid(event));
  });
  elements.hintButton.addEventListener("click", showHint);
  elements.undoButton.addEventListener("click", undo);
  elements.clearButton.addEventListener("click", clearDrawing);
  elements.doneButton.addEventListener("click", checkShape);
  elements.answerButton.addEventListener("click", revealAnswer);
  elements.skipButton.addEventListener("click", loadNext);
  elements.nextButton.addEventListener("click", loadNext);
  elements.expandButton.addEventListener("click", toggleExpandedSky);
  elements.coordinateForm.addEventListener("submit", addCoordinateFromForm);
  elements.settingsButton.addEventListener("click", openReferenceSettings);
  elements.settingsClose.addEventListener("click", () => elements.settingsDialog.close());
  elements.referenceSelect.addEventListener("change", (event) => loadReferenceEditor(event.target.value));
  elements.referenceSky.addEventListener("click", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    handleReferencePointer(event);
  });
  elements.referenceUndo.addEventListener("click", undoReferenceEdit);
  elements.referenceClear.addEventListener("click", clearReferenceEditor);
  elements.referenceAlpha.addEventListener("click", () => {
    editor.alphaMode = !editor.alphaMode;
    editorMessage(editor.alphaMode ? "Теперь нажмите нужную точку на поле." : "Выбор α-звезды отменён.");
    renderReferenceEditor();
  });
  elements.referenceReset.addEventListener("click", resetReferenceEditor);
  elements.referenceSave.addEventListener("click", saveReferenceEditor);
  elements.settingsDialog.addEventListener("click", (event) => {
    if (event.target === elements.settingsDialog) elements.settingsDialog.close();
  });
  elements.guideButton.addEventListener("click", () => { elements.guideDialog.showModal(); startGuideDemo(); });
  elements.guideClose.addEventListener("click", () => elements.guideDialog.close());
  elements.guideStart.addEventListener("click", () => { elements.guideDialog.close(); elements.sky.focus(); });
  elements.guideDialog.addEventListener("click", (event) => {
    if (event.target === elements.guideDialog) elements.guideDialog.close();
  });
  elements.guideDialog.addEventListener("close", stopGuideDemo);
  window.addEventListener("resize", fitTaskTitle);
  document.fonts?.ready.then(fitTaskTitle);

  document.addEventListener("keydown", (event) => {
    if (elements.settingsDialog.open) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoReferenceEdit();
      }
      return;
    }
    if (!elements.resultPanel.hidden) {
      if (event.key === "Tab") {
        event.preventDefault();
        elements.nextButton.focus();
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); undo(); return; }
    if (event.key === "Escape" && state.phase === "draw") {
      state.active = null;
      state.chainStart = null;
      state.chainEdges = 0;
      state.branchArmed = false;
      setStatus("Выбор снят. Нажмите любую готовую вершину, чтобы продолжить из неё.", "");
      renderDrawing();
      return;
    }
    if (document.activeElement !== elements.sky) return;
    const step = event.shiftKey ? 2 : 1;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowLeft") state.keyboardCursor.x = Math.max(GRID.minX, state.keyboardCursor.x - step);
    if (event.key === "ArrowRight") state.keyboardCursor.x = Math.min(GRID.maxX, state.keyboardCursor.x + step);
    if (event.key === "ArrowUp") state.keyboardCursor.y = Math.min(GRID.maxY, state.keyboardCursor.y + step);
    if (event.key === "ArrowDown") state.keyboardCursor.y = Math.max(GRID.minY, state.keyboardCursor.y - step);
    if (event.key === "Enter" || event.key === " ") addGridPoint({ ...state.keyboardCursor });
    renderKeyboardCursor();
  });

  populateCoordinateLists();
  elements.roundTotal.textContent = objects.length;
  saveStats();
  loadNext();
})();
