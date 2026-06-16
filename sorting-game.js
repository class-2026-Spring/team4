const roundCount = document.getElementById("round-count");
const sorterScore = document.getElementById("sorter-score");
const missCount = document.getElementById("miss-count");
const fallingItem = document.getElementById("falling-item");
const itemSymbol = document.getElementById("item-symbol");
const itemName = document.getElementById("item-name");
const sorterMessage = document.getElementById("sorter-message");
const binRow = document.getElementById("bin-row");
const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");
const resultPanel = document.getElementById("result-panel");
const resultTitle = document.getElementById("result-title");
const resultSummary = document.getElementById("result-summary");
const reviewList = document.getElementById("review-list");
const restartButton = document.getElementById("restart-button");
const gameNotice = document.getElementById("game-notice");

// 낙하 시간 (ms) 구간별 설정
// 1~5라운드: 4600ms (느리게 워밍업)
// 6~10라운드: 4100ms (조금 빠르게)
// 11라운드~: 3600ms부터 시작해서 5라운드마다 200ms씩 단축
const MIN_FALL_DURATION = 800; // 최소 낙하 시간

let bins = [];
let items = [];
let currentItem = null;
let round = 0;
let score = 0;
let misses = 0;
let falling = false;
let startedAt = 0;
let animationId = null;
let history = [];

fetch("data/sorting-game.json")
  .then((response) => response.json())
  .then((gameData) => {
    bins = gameData.bins;
    items = gameData.items;
    gameNotice.textContent = gameData.notice;
    renderBins();
    resetGame();
  });

startButton.addEventListener("click", () => {
  resultPanel.hidden = true;
  startButton.textContent = "진행 중";
  startButton.disabled = true;
  nextDrop();
});

resetButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", () => {
  resetGame();
  nextDrop();
});

function getFallDuration() {
  if (round <= 5) return 4600;           // 1~5라운드: 느린 워밍업
  if (round <= 10) return 4100;          // 6~10라운드: 중간 속도
  // 11라운드~: 3600ms부터 5라운드마다 200ms씩 단축
  const speedLevel = Math.floor((round - 11) / 5);
  return Math.max(3600 - speedLevel * 200, MIN_FALL_DURATION);
}

function renderBins() {
  binRow.innerHTML = "";
  bins.forEach((bin, index) => {
    const button = document.createElement("button");
    button.className = "sort-bin";
    button.type = "button";
    button.dataset.bin = bin.id;
    button.style.setProperty("--bin-color", bin.color);
    button.innerHTML = `<span></span><strong>${index + 1}. ${bin.name}</strong>`;
    button.addEventListener("click", () => chooseBin(bin.id));
    binRow.appendChild(button);
  });
}

function resetGame() {
  cancelAnimationFrame(animationId);
  round = 0;
  score = 0;
  misses = 0;
  falling = false;
  history = [];
  currentItem = null;
  startButton.disabled = false;
  startButton.textContent = "게임 시작";
  resultPanel.hidden = true;
  updateStatus();
  setItemVisual(null);
  sorterMessage.textContent = "시작 버튼을 누르면 쓰레기가 떨어집니다.";
}

function nextDrop() {
  round += 1;
  currentItem = items[Math.floor(Math.random() * items.length)];
  falling = true;
  startedAt = performance.now();
  setItemVisual(currentItem);

  if (round === 1) {
    sorterMessage.textContent = "천천히 시작해볼까요? 알맞은 분리수거함을 클릭하세요.";
  } else if (round === 6) {
    sorterMessage.textContent = "⚡ 속도가 조금 빨라집니다!";
  } else if (round === 11) {
    sorterMessage.textContent = "⚡ 본격 시작! 속도가 빨라집니다!";
  } else if (round > 11 && (round - 11) % 5 === 0) {
    const speedLevel = Math.floor((round - 11) / 5);
    sorterMessage.textContent = `⚡ ${speedLevel}단계! 더 빨라졌습니다!`;
  } else {
    sorterMessage.textContent = "알맞은 분리수거함을 클릭하세요.";
  }

  updateStatus();
  animateDrop(startedAt);
}

function animateDrop(now) {
  if (!falling) return;
  const fallDuration = getFallDuration();
  const progress = Math.min((now - startedAt) / fallDuration, 1);
  const x = 12 + ((round * 19) % 76);
  const y = 10 + progress * 68;
  fallingItem.style.left = `${x}%`;
  fallingItem.style.top = `${y}%`;

  if (progress >= 1) {
    misses += 1;
    recordAnswer(null, false);
    sorterMessage.textContent = `${currentItem.name}을 놓쳤어요. 정답은 ${binName(currentItem.category)}입니다.`;
    falling = false;
    updateStatus();
    scheduleNextDrop();
    return;
  }
  animationId = requestAnimationFrame(animateDrop);
}

function chooseBin(binId) {
  if (!falling || !currentItem) return;
  const correct = binId === currentItem.category;
  cancelAnimationFrame(animationId);
  falling = false;

  if (correct) {
    score += 1;
    sorterMessage.textContent = `정답! ${currentItem.name}은 ${binName(currentItem.category)}로 분리해요.`;
  } else {
    misses += 1;
    sorterMessage.textContent = `아쉬워요. ${currentItem.name}은 ${binName(currentItem.category)}가 맞아요.`;
  }

  recordAnswer(binId, correct);
  updateStatus();
  pulseBin(binId, correct);
  scheduleNextDrop();
}

function scheduleNextDrop() {
  setTimeout(() => {
    nextDrop();
  }, 950);
}

function updateStatus() {
  let speedText = "";
  if (round <= 5) speedText = " · 🐢 워밍업";
  else if (round <= 10) speedText = " · 🚶 준비";
  else {
    const speedLevel = Math.floor((round - 11) / 5);
    speedText = speedLevel > 0 ? ` · ⚡ ${speedLevel}단계` : " · 🏃 시작";
  }
  roundCount.textContent = `${round}라운드${speedText}`;
  sorterScore.textContent = `${score}점`;
  missCount.textContent = `놓친 쓰레기 ${misses}개`;
}

function recordAnswer(selectedBin, correct) {
  history.push({
    ...currentItem,
    selectedBin,
    correct,
  });
}

function setItemVisual(item) {
  if (!item) {
    fallingItem.style.left = "50%";
    fallingItem.style.top = "12%";
    itemSymbol.textContent = "?";
    itemName.textContent = "시작 대기";
    return;
  }
  itemSymbol.textContent = item.symbol;
  itemName.textContent = item.name;
}

function pulseBin(binId, correct) {
  const bin = binRow.querySelector(`[data-bin="${binId}"]`);
  if (!bin) return;
  bin.classList.add(correct ? "is-correct" : "is-wrong");
  setTimeout(() => {
    bin.classList.remove("is-correct", "is-wrong");
  }, 520);
}

function binName(binId) {
  return bins.find((bin) => bin.id === binId)?.name ?? "알 수 없음";
}

document.addEventListener("keydown", (e) => {
  const keyMap = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5 };
  if (e.key in keyMap) {
    const bin = bins[keyMap[e.key]];
    if (bin) chooseBin(bin.id);
  }
});
