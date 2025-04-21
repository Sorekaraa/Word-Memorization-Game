const gameArea = document.getElementById("gameArea");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const difficultySlider = document.getElementById("difficulty-slider");
const speedValue = document.getElementById("speed-value");
const scoreDisplay = document.getElementById("score");
const feedback = document.getElementById("feedback");
const gameOverModal = document.getElementById("gameOverModal");
const finalScore = document.getElementById("final-score");
const closeModalBtn = document.getElementById("close-modal-btn");

const rows = 10;
const cols = 6;
const cellSize = 50; // 每个格子的大小
let grid = Array.from({ length: rows }, () => Array(cols).fill(null));
let dropInterval;
let gameOverFlag = false;
let isPaused = false;
let score = 0;
let selectedBlocks = [];
let langBalance = 0;
let isGameRunning = false;

const wordPairs = [
    { zh: "苹果", en: "apple" },
    { zh: "香蕉", en: "banana" },
    { zh: "猫", en: "cat" },
    { zh: "狗", en: "dog" },
    { zh: "桌子", en: "table" },
    { zh: "椅子", en: "chair" },
    { zh: "房子", en: "house" },
    { zh: "水", en: "water" },
    { zh: "书", en: "book" },
    { zh: "树", en: "tree" },
    { zh: "车", en: "car" },
    { zh: "鸟", en: "bird" },
    { zh: "花", en: "flower" },
    { zh: "食物", en: "food" },
    { zh: "学校", en: "school" },
    { zh: "电脑", en: "computer" },
    { zh: "手机", en: "phone" },
    { zh: "电视", en: "television" },
    { zh: "音乐", en: "music" },
    { zh: "运动", en: "sport" }
];

let usedZhWords = new Set();
let usedEnWords = new Set();

function showFeedback(text, isPositive) {
    feedback.textContent = text;
    feedback.style.color = isPositive ? "#4CAF50" : "#f44336";
    feedback.classList.remove("hidden");
    setTimeout(() => feedback.classList.add("hidden"), 1500);
}

function createBlock(word, lang, row, col) {
    const block = document.createElement("div");
    block.classList.add("block", lang);
    block.innerText = word;

    // 设置方块位置和大小
    block.style.width = `${cellSize}px`;
    block.style.height = `${cellSize}px`;
    block.style.top = `${row * cellSize}px`;
    block.style.left = `${col * cellSize}px`;

    // 根据单词长度调整字体大小
    const length = word.length;
    if (length > 4) {
        block.style.fontSize = "10px";
    } else if (length > 2) {
        block.style.fontSize = "12px";
    } else {
        block.style.fontSize = "14px";
    }

    block.dataset.word = word;
    block.dataset.lang = lang;
    block.dataset.row = row;
    block.dataset.col = col;

    block.addEventListener("click", () => handleBlockClick(block));
    gameArea.appendChild(block);
    return block;
}

function handleBlockClick(block) {
    if (gameOverFlag || isPaused || !isGameRunning) return;

    if (block.classList.contains("selected")) {
        block.classList.remove("selected");
        selectedBlocks = selectedBlocks.filter(b => b !== block);
        return;
    }

    if (selectedBlocks.length >= 2) {
        const first = selectedBlocks[0];
        first.classList.remove("selected");
        selectedBlocks = selectedBlocks.slice(1);
    }

    block.classList.add("selected");
    selectedBlocks.push(block);

    if (selectedBlocks.length === 2) {
        const [b1, b2] = selectedBlocks;
        const pair = wordPairs.find(p =>
            (p.zh === b1.dataset.word && p.en === b2.dataset.word) ||
            (p.en === b1.dataset.word && p.zh === b2.dataset.word)
        );

        if (pair && b1.dataset.lang !== b2.dataset.lang) {
            b1.classList.add("correct");
            b2.classList.add("correct");
            setTimeout(() => {
                removeBlock(b1);
                removeBlock(b2);
                score += 10;
                scoreDisplay.textContent = `分数：${score}`;
                showFeedback("+10", true);
            }, 500);
        } else {
            b1.classList.add("wrong");
            b2.classList.add("wrong");
            setTimeout(() => {
                b1.classList.remove("selected", "wrong");
                b2.classList.remove("selected", "wrong");
                score = Math.max(0, score - 5);
                scoreDisplay.textContent = `分数：${score}`;
                showFeedback("-5", false);
            }, 500);
        }
        selectedBlocks = [];
    }
}

function removeBlock(block) {
    const row = parseInt(block.dataset.row);
    const col = parseInt(block.dataset.col);
    grid[row][col] = null;
    if (block.dataset.lang === "zh") {
        usedZhWords.delete(block.dataset.word);
    } else {
        usedEnWords.delete(block.dataset.word);
    }
    block.remove();
}

function dropNewBlock() {
    if (isPaused || gameOverFlag || !isGameRunning) return;

    let lang;
    if (langBalance > 0) {
        lang = "en";
        langBalance--;
    } else if (langBalance < 0) {
        lang = "zh";
        langBalance++;
    } else {
        lang = Math.random() > 0.5 ? "zh" : "en";
        langBalance += lang === "zh" ? 1 : -1;
    }

    // 获取可用的单词
    let availableWords;
    if (lang === "zh") {
        availableWords = wordPairs
            .filter(p => !usedZhWords.has(p.zh))
            .map(p => ({ word: p.zh, lang }));
    } else {
        availableWords = wordPairs
            .filter(p => !usedEnWords.has(p.en))
            .map(p => ({ word: p.en, lang }));
    }

    // 如果没有可用单词，重置使用记录
    if (availableWords.length === 0) {
        if (lang === "zh") {
            usedZhWords.clear();
            availableWords = wordPairs.map(p => ({ word: p.zh, lang }));
        } else {
            usedEnWords.clear();
            availableWords = wordPairs.map(p => ({ word: p.en, lang }));
        }
    }

    const { word, lang: selectedLang } = availableWords[Math.floor(Math.random() * availableWords.length)];
    const col = Math.floor(Math.random() * cols);
    let row = rows - 1;

    while (row >= 0 && grid[row][col] !== null) {
        row--;
    }

    if (row < 0) {
        return gameOver();
    }

    const block = createBlock(word, selectedLang, row, col);
    grid[row][col] = { word, lang: selectedLang, element: block };
    if (selectedLang === "zh") {
        usedZhWords.add(word);
    } else {
        usedEnWords.add(word);
    }
    checkRedLine(row);
}

function checkRedLine(row) {
    const redLineRow = Math.floor(rows * 0.2); // 红线在20%高度处
    if (row <= redLineRow) {
        gameOver();
    }
}

function gameOver() {
    clearInterval(dropInterval);
    finalScore.textContent = score;
    gameOverModal.classList.remove("hidden");
    setTimeout(() => gameOverModal.classList.add("show"), 10);
    gameOverFlag = true;
    isGameRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = "🔄 重新开始";
}

function resetGame() {
    clearInterval(dropInterval);
    gameArea.querySelectorAll(".block").forEach(b => b.remove());
    grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    score = 0;
    scoreDisplay.textContent = `分数：0`;
    gameOverFlag = false;
    isPaused = false;
    selectedBlocks = [];
    usedZhWords.clear();
    usedEnWords.clear();
    langBalance = 0;
    gameOverModal.classList.remove("show");
    setTimeout(() => gameOverModal.classList.add("hidden"), 300);
    pauseBtn.textContent = "⏸️ 暂停";
    pauseBtn.disabled = false;
}

function startGame() {
    resetGame();
    isGameRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    restartDropInterval();
}

function restartDropInterval() {
    clearInterval(dropInterval);
    const speed = parseInt(difficultySlider.value);
    dropInterval = setInterval(dropNewBlock, speed);
}

function togglePause() {
    if (!isGameRunning) return;

    isPaused = !isPaused;
    if (isPaused) {
        clearInterval(dropInterval);
        pauseBtn.textContent = "▶️ 继续";
    } else {
        restartDropInterval();
        pauseBtn.textContent = "⏸️ 暂停";
    }
}

// 事件监听
startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);
closeModalBtn.addEventListener("click", () => {
    gameOverModal.classList.remove("show");
    setTimeout(() => gameOverModal.classList.add("hidden"), 300);
});

difficultySlider.addEventListener("input", () => {
    const speed = difficultySlider.value;
    speedValue.textContent = `${speed}ms`;
    if (isGameRunning && !isPaused) {
        restartDropInterval();
    }
});

// 初始化
speedValue.textContent = `${difficultySlider.value}ms`;
