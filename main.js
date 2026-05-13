const STORAGE_KEY = "mandalart-board-v1";
const GRID_SIZE = 9;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const board = document.getElementById("board");
const statusEl = document.getElementById("status");
const resetButton = document.getElementById("resetButton");
const sampleButton = document.getElementById("sampleButton");

const sampleValues = [
  "大目標",
  "習慣",
  "学び",
  "健康",
  "発信",
  "仕事",
  "チーム",
  "時間管理",
  "振り返り",
];

const blockHues = [
  12,
  48,
  84,
  132,
  168,
  204,
  252,
  288,
  324,
];

const linkMap = new Map(
  [
    [3, 3, 1, 1],
    [4, 3, 4, 1],
    [5, 3, 7, 1],
    [3, 4, 1, 4],
    [4, 4, 4, 4],
    [5, 4, 7, 4],
    [3, 5, 1, 7],
    [4, 5, 4, 7],
    [5, 5, 7, 7],
  ].map(([sourceCol, sourceRow, targetCol, targetRow]) => [
    `${sourceRow},${sourceCol}`,
    { targetCol, targetRow },
  ])
);

const state = loadState();
let saveTimer = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return Array.from({ length: TOTAL_CELLS }, () => "");
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== TOTAL_CELLS) {
      return Array.from({ length: TOTAL_CELLS }, () => "");
    }

    return parsed.map((value) => (typeof value === "string" ? value : ""));
  } catch {
    return Array.from({ length: TOTAL_CELLS }, () => "");
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  statusEl.textContent = "保存しました";
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    statusEl.textContent = "未保存の変更はありません";
  }, 1200);
}

function getLinkedTargetIndices(index) {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  const target = linkMap.get(`${row},${col}`);
  if (!target) {
    return [];
  }

  return [target.targetRow * GRID_SIZE + target.targetCol];
}

function syncLinkedCells(index, value) {
  const linkedIndices = getLinkedTargetIndices(index);
  if (linkedIndices.length === 0) {
    return;
  }

  linkedIndices.forEach((linkedIndex) => {
    state[linkedIndex] = value;
    const linkedTextarea = board.querySelector(`[data-index="${linkedIndex}"]`);
    if (linkedTextarea && linkedTextarea.value !== value) {
      linkedTextarea.value = value;
    }
    updateCellVisual(linkedIndex, value);
  });
}

function syncAllLinkedCells() {
  [3, 4, 5].forEach((row) => {
    [3, 4, 5].forEach((col) => {
      const sourceIndex = row * GRID_SIZE + col;
      syncLinkedCells(sourceIndex, state[sourceIndex]);
    });
  });
}

function moveFocus(currentIndex, deltaRow, deltaCol) {
  const row = Math.floor(currentIndex / GRID_SIZE);
  const col = currentIndex % GRID_SIZE;
  const nextRow = Math.min(Math.max(row + deltaRow, 0), GRID_SIZE - 1);
  const nextCol = Math.min(Math.max(col + deltaCol, 0), GRID_SIZE - 1);
  const nextIndex = nextRow * GRID_SIZE + nextCol;
  const nextTextarea = board.querySelector(`[data-index="${nextIndex}"]`);
  if (nextTextarea) {
    nextTextarea.focus();
    nextTextarea.select();
  }
}

function updateCellVisual(index, value) {
  const cell = board.querySelector(`[data-cell-index="${index}"]`);
  if (!cell) return;
  cell.classList.toggle("is-filled", value.trim().length > 0);
}

function getBlockHue(row, col) {
  const blockRow = Math.floor(row / 3);
  const blockCol = Math.floor(col / 3);
  return blockHues[blockRow * 3 + blockCol];
}

function renderBoard() {
  board.innerHTML = "";

  for (let index = 0; index < TOTAL_CELLS; index += 1) {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const band = row === 4 && col === 4 ? "center" : row % 3 === 1 && col % 3 === 1 ? "major" : "normal";
    const blockHue = getBlockHue(row, col);
    const isMiddleBlock = row >= 3 && row <= 5 && col >= 3 && col <= 5;
    const isCenterCore = row === 4 && col === 4;

    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.cellIndex = String(index);
    cell.dataset.band = isCenterCore ? "center-core" : isMiddleBlock ? "center-block" : band;
    cell.style.setProperty("--block-hue", String(blockHue));

    const textarea = document.createElement("textarea");
    textarea.rows = 2;
    textarea.spellcheck = false;
    textarea.autocomplete = "off";
    textarea.autocapitalize = "off";
    textarea.autocorrect = "off";
    textarea.dataset.index = String(index);
    textarea.setAttribute("aria-label", `セル ${index + 1}`);
    textarea.value = state[index];

    textarea.addEventListener("input", () => {
      state[index] = textarea.value;
      updateCellVisual(index, textarea.value);
      syncLinkedCells(index, textarea.value);
      persistState();
    });

    textarea.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveFocus(index, 0, 1);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveFocus(index, 0, -1);
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(index, 1, 0);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveFocus(index, -1, 0);
      }
    });

    cell.append(textarea);
    board.append(cell);
    updateCellVisual(index, state[index]);
  }
}

function clearBoard() {
  for (let index = 0; index < TOTAL_CELLS; index += 1) {
    state[index] = "";
  }

  syncAllLinkedCells();

  const textareas = board.querySelectorAll("textarea");
  textareas.forEach((textarea, index) => {
    textarea.value = "";
    updateCellVisual(index, "");
  });

  persistState();
}

function fillSample() {
  const labels = [
    "大目標",
    "仕事",
    "学習",
    "健康",
    "生活",
    "発信",
    "人間関係",
    "整理",
    "習慣",
  ];

  for (let index = 0; index < TOTAL_CELLS; index += 1) {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const isCore = row === 4 && col === 4;
    const isAnchor = row % 3 === 1 && col % 3 === 1;
    const nextValue = isCore ? "1つの中心目標" : isAnchor ? labels[(row + col) % labels.length] : sampleValues[(index + row) % sampleValues.length];

    state[index] = nextValue;
  }

  syncAllLinkedCells();

  const textareas = board.querySelectorAll("textarea");
  textareas.forEach((textarea, index) => {
    textarea.value = state[index];
    updateCellVisual(index, state[index]);
  });

  persistState();
}

resetButton.addEventListener("click", clearBoard);
sampleButton.addEventListener("click", fillSample);

renderBoard();
syncAllLinkedCells();
statusEl.textContent = state.some((value) => value.trim().length > 0) ? "前回の入力を復元しました" : "未保存の変更はありません";
