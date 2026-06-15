const STORAGE_KEY = "mandalart-board-v1";
const GRID_SIZE = 9;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const board = document.getElementById("board");
const statusEl = document.getElementById("status");
const resetButton = document.getElementById("resetButton");
const sampleGameButton = document.getElementById("sampleGameButton");
const sampleMoyamoyaButton = document.getElementById("sampleMoyamoyaButton");
const sampleFavoriteButton = document.getElementById("sampleFavoriteButton");
const exportButton = document.getElementById("exportButton");
const importButton = document.getElementById("importButton");
const csvFileInput = document.getElementById("csvFileInput");
const saveImageButton = document.getElementById("saveImageButton");

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
const centerTemplatePlaceholders = new Map();
let saveTimer = null;

const centerTemplates = {
  game: [
    [
      { placeholder: "好きなキャラクターは誰かな？" },
      { placeholder: "どの機能が好きかな？" },
      { placeholder: "音楽、デザインはどうかな？" },
    ],
    [
      { placeholder: "作品のどんなところが好き？" },
      { placeholder: "ここに、好きな作品を書いてみよう" },
      { placeholder: "作品のどんなところが好き？" },
    ],
    [
      { placeholder: "作品のどんなところが好き？" },
      { placeholder: "作品のどんなところが好き？" },
      { placeholder: "作品のどんなところが好き？" },
    ],
  ],
  moyamoya: [
    [
      { placeholder: "どうして困っているのかな？" },
      { placeholder: "いつ・どこで困るかな？" },
      { placeholder: "どんな人が困っているかな？" },
    ],
    [
      { placeholder: "どうやって解決したいかな？" },
      { placeholder: "ここに、解決したいモヤモヤを書いてみよう" },
      { placeholder: "何かに例えたりできないかな？" },
    ],
    [
      { placeholder: "自分で深掘りポイントを考えてみよう！" },
      { placeholder: "自分で深掘りポイントを考えてみよう！" },
      { placeholder: "自分で深掘りポイントを考えてみよう！" },
    ],
  ],
  favorite: [
    [
      { placeholder: "好きになった時の自分を書いてみよう！" },
      { placeholder: "どういう所が一番「好き」かな？" },
      { placeholder: "好きなもので、やってみたいことはあるかな？" },
    ],
    [
      { placeholder: "自分で推しポイントを書いてみよう！"  },
      { placeholder: "ここに、自分の好きなものを書いてみよう" },
      { placeholder: "自分で推しポイントを書いてみよう！" },
    ],
    [
      { placeholder: "自分で推しポイントを書いてみよう！" },
      { placeholder: "自分で推しポイントを書いてみよう！" },
      { placeholder: "自分で推しポイントを書いてみよう！" },
    ],
  ],
};

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

function getCenterBlockCellIndex(localRow, localCol) {
  const row = localRow + 2;
  const col = localCol + 2;
  return row * GRID_SIZE + col;
}

function applyCenterTemplate(template) {
  centerTemplatePlaceholders.clear();

  for (let localRow = 1; localRow <= 3; localRow += 1) {
    for (let localCol = 1; localCol <= 3; localCol += 1) {
      const index = getCenterBlockCellIndex(localRow, localCol);
      const entry = template[localRow - 1][localCol - 1];

      if (entry.placeholder) {
        state[index] = "";
        centerTemplatePlaceholders.set(index, entry.placeholder);
      } else {
        state[index] = entry.value;
      }
    }
  }

  syncAllLinkedCells();

  const textareas = board.querySelectorAll("textarea");
  textareas.forEach((textarea, index) => {
    textarea.value = state[index];
    textarea.placeholder = centerTemplatePlaceholders.get(index) || "";
    updateCellVisual(index, state[index]);
  });

  persistState();
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
    textarea.placeholder = centerTemplatePlaceholders.get(index) || "";

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

  centerTemplatePlaceholders.clear();

  syncAllLinkedCells();

  const textareas = board.querySelectorAll("textarea");
  textareas.forEach((textarea, index) => {
    textarea.value = "";
    textarea.placeholder = "";
    updateCellVisual(index, "");
  });

  persistState();
}

resetButton.addEventListener("click", () => {
  if (confirm("本当にすべての内容を消去しますか？")) {
    clearBoard();
  }
});
sampleGameButton.addEventListener("click", () => applyCenterTemplate(centerTemplates.game));
sampleMoyamoyaButton.addEventListener("click", () => applyCenterTemplate(centerTemplates.moyamoya));
sampleFavoriteButton.addEventListener("click", () => applyCenterTemplate(centerTemplates.favorite));

function getGridData() {
  const gridData = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const rowData = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      const index = row * GRID_SIZE + col;
      // CSVで値がnullやundefinedになるのを防ぐため、空文字に変換
      const value = state[index] || "";
      // CSVの区切り文字や改行が含まれている場合に備えて、値をダブルクォーテーションで囲む
      rowData.push(`"${value.replace(/"/g, '""')}"`);
    }
    gridData.push(rowData);
  }
  return gridData;
}

function exportToCSV() {
  const gridData = getGridData();
  const csvContent = gridData.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "mandala-sheet.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function importFromCSV(csvText) {
  const rows = csvText.split("\n").map(row => {
    // ダブルクォーテーションで囲まれたフィールドを正しく解析するための正規表現
    const regex = /"([^"]*(?:""[^"]*)*)"|([^,]+)/g;
    const cols = [];
    let match;
    while (match = regex.exec(row)) {
      if (match[1] !== undefined) {
        // ダブルクォーテーションで囲まれた値
        cols.push(match[1].replace(/""/g, '"'));
      } else if (match[2] !== undefined) {
        // ダブルクォーテーションで囲まれていない値
        cols.push(match[2]);
      }
    }
    // 行末の空のフィールドを補完
    const trailingCommas = row.endsWith(',') ? 1 : 0;
    for (let i = 0; i < trailingCommas; i++) {
      cols.push('');
    }
    return cols;
  });

  if (rows.length !== GRID_SIZE) {
    alert(`CSVファイルの形式が正しくありません。${GRID_SIZE}行である必要があります。`);
    return;
  }

  for (let i = 0; i < GRID_SIZE; i++) {
    const cols = rows[i];
    if (cols.length !== GRID_SIZE) {
      alert(`CSVファイルの形式が正しくありません。${i + 1}行目が${GRID_SIZE}列ではありません。`);
      return;
    }
    for (let j = 0; j < GRID_SIZE; j++) {
      const index = i * GRID_SIZE + j;
      state[index] = cols[j] || "";
    }
  }

  syncAllLinkedCells();

  const textareas = board.querySelectorAll("textarea");
  textareas.forEach((textarea, index) => {
    textarea.value = state[index];
    updateCellVisual(index, state[index]);
  });

  persistState();
  statusEl.textContent = "CSVからデータを読み込みました";
}

exportButton.addEventListener("click", exportToCSV);
importButton.addEventListener("click", () => csvFileInput.click());
csvFileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    importFromCSV(e.target.result);
  };
  reader.readAsText(file);
  // 同じファイルを連続で選択できるようにするため
  event.target.value = '';
});

function saveAsImage() {
  const boardElement = document.getElementById('board');
  html2canvas(boardElement).then(canvas => {
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.setAttribute("href", image);
    link.setAttribute("download", "mandala-sheet.png");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

saveImageButton.addEventListener("click", saveAsImage);

renderBoard();
syncAllLinkedCells();
statusEl.textContent = state.some((value) => value.trim().length > 0) ? "前回の入力を復元しました" : "未保存の変更はありません";
