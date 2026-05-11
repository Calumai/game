const questions = [
  {
    words: ["Nga'ay", "ho", "!"],
    roman: ["Nga'ay", "ho", "!"],
    zh: "你好！",
  },
  {
    words: ["O", "wawa", "ko", "kiso", "?"],
    roman: ["O", "wawa", "ko", "kiso", "?"],
    zh: "你是孩子嗎？",
  },
  {
    words: ["Mita", "ko", "loma'", "ako", "."],
    roman: ["Mita", "ko", "loma'", "ako", "."],
    zh: "我看見我的家。",
  },
  {
    words: ["Maolah", "ako", "to", "tayal", "."],
    roman: ["Maolah", "ako", "to", "tayal", "."],
    zh: "我喜歡工作/活動。",
  },
  {
    words: ["Tengil", "to", "Pangcah", "a", "kiso", "."],
    roman: ["Tengil", "to", "Pangcah", "a", "kiso", "."],
    zh: "請你聽阿美語。",
  },
];

const ranks = [
  ["1", "Lisin", 100, "00:01:39.222"],
  ["2", "Fangay", 100, "00:02:43.585"],
  ["3", "Kacaw", 100, "00:03:00.665"],
  ["4", "Mayaw", 98, "00:03:20.089"],
  ["5", "Aki", 96, "00:04:14.938"],
  ["6", "Futing", 94, "00:04:47.452"],
  ["7", "Sera", 91, "00:05:47.339"],
];

const screens = {
  story: document.querySelector("#storyScreen"),
  rules: document.querySelector("#rulesScreen"),
  game: document.querySelector("#gameScreen"),
  result: document.querySelector("#resultScreen"),
  answers: document.querySelector("#answersScreen"),
};

const storyLines = [
  "Nga'ay ho! 今天部落廣場有練習，別只顧著看海，快來一起聽阿美語吧！",
  "海風有點大，句子會被吹散。你聽見什麼，就照順序把詞語接回來。",
  "準備好了嗎？先聽，再看，再打擊。讓話語回到正確的位置。",
];

let storyIndex = 0;
let currentQuestion = 0;
let currentWord = 0;
let score = 0;
let mistakes = 0;
let startTime = 0;
let timerId = 0;
let spawnId = 0;
let moveId = 0;
let soundOn = true;
let activeWords = [];
let completed = [];

const storyLine = document.querySelector("#storyLine");
const nextStoryBtn = document.querySelector("#nextStoryBtn");
const skipStoryBtn = document.querySelector("#skipStoryBtn");
const startBtn = document.querySelector("#startBtn");
const soundBtn = document.querySelector("#soundBtn");
const soundIcon = document.querySelector("#soundIcon");
const questionLabel = document.querySelector("#questionLabel");
const progressFill = document.querySelector("#progressFill");
const timerText = document.querySelector("#timerText");
const answerSlots = document.querySelector("#answerSlots");
const wordLane = document.querySelector("#wordLane");
const hitPanel = document.querySelector("#hitPanel");
const playPromptBtn = document.querySelector("#playPromptBtn");
const retryBtn = document.querySelector("#retryBtn");
const answersBtn = document.querySelector("#answersBtn");
const closeAnswersBtn = document.querySelector("#closeAnswersBtn");
const resultTitle = document.querySelector("#resultTitle");
const scoreText = document.querySelector("#scoreText");
const resultMeta = document.querySelector("#resultMeta");
const rankList = document.querySelector("#rankList");
const answersList = document.querySelector("#answersList");
const scoreRing = document.querySelector(".score-ring");

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("screen-active"));
  screens[name].classList.add("screen-active");
}

function speak(text) {
  if (!soundOn) return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.78;
  utterance.pitch = 1.04;
  window.speechSynthesis.speak(utterance);
}

function tickSound(type = "ok") {
  if (!soundOn) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = type === "ok" ? 720 : 180;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.13);
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  const centis = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");
  return `00:${minutes}:${seconds}.${centis}`;
}

function updateTimer() {
  timerText.textContent = formatTime(Date.now() - startTime).replace(/\.\d+$/, "");
}

function startGame() {
  currentQuestion = 0;
  currentWord = 0;
  score = 0;
  mistakes = 0;
  completed = [];
  startTime = Date.now();
  showScreen("game");
  timerId = window.setInterval(updateTimer, 250);
  loadQuestion();
}

function clearLoops() {
  window.clearInterval(spawnId);
  window.clearInterval(moveId);
  spawnId = 0;
  moveId = 0;
}

function loadQuestion() {
  clearLoops();
  activeWords = [];
  wordLane.innerHTML = "";
  currentWord = 0;
  mistakes = 0;
  const question = questions[currentQuestion];
  questionLabel.textContent = `題目 ${currentQuestion + 1}/${questions.length}`;
  progressFill.style.width = `${(currentQuestion / questions.length) * 100}%`;
  answerSlots.innerHTML = question.words
    .map((word, index) => `<div class="slot empty" data-index="${index}">${word}</div>`)
    .join("");
  speak(question.words.join(" "));
  spawnWords();
  spawnId = window.setInterval(spawnWords, 1350);
  moveId = window.setInterval(moveWords, 20);
}

function spawnWords() {
  if (!screens.game.classList.contains("screen-active")) return;
  const question = questions[currentQuestion];
  const pool = [...question.words, ...questions.flatMap((item) => item.words)]
    .filter((word) => word !== "." && word !== "," && word !== "?")
    .sort(() => Math.random() - 0.5);
  const needed = question.words[currentWord];
  const word = Math.random() < 0.58 ? needed : pool[Math.floor(Math.random() * pool.length)];
  const card = document.createElement("button");
  card.type = "button";
  card.className = "word-card";
  card.textContent = word;
  card.dataset.word = word;
  card.style.left = `${window.innerWidth + 20}px`;
  card.style.top = `${20 + Math.random() * 54}px`;
  card.addEventListener("click", () => hitWord(card));
  wordLane.appendChild(card);
  activeWords.push({
    el: card,
    x: window.innerWidth + 20,
    speed: 1.4 + Math.random() * 1.2,
  });
}

function moveWords() {
  activeWords.forEach((item) => {
    item.x -= item.speed;
    item.el.style.left = `${item.x}px`;
  });
  activeWords = activeWords.filter((item) => {
    const keep = item.x > -140 && item.el.isConnected;
    if (!keep) item.el.remove();
    return keep;
  });
}

function hitNearest() {
  const center = window.innerWidth * 0.32;
  const candidates = activeWords
    .filter((item) => item.el.isConnected)
    .map((item) => ({ item, distance: Math.abs(item.x - center) }))
    .sort((a, b) => a.distance - b.distance);
  if (candidates[0]) hitWord(candidates[0].item.el);
}

function hitWord(card) {
  const question = questions[currentQuestion];
  const expected = question.words[currentWord];
  if (card.dataset.word === expected) {
    const slot = answerSlots.querySelector(`[data-index="${currentWord}"]`);
    slot.classList.remove("empty");
    tickSound("ok");
    card.classList.add("hit");
    window.setTimeout(() => card.remove(), 150);
    currentWord += 1;
    score += 4;
    if (currentWord >= question.words.length) {
      completed.push(currentQuestion);
      window.setTimeout(nextQuestion, 450);
    }
    return;
  }
  mistakes += 1;
  tickSound("bad");
  card.classList.add("miss");
  window.setTimeout(() => card.classList.remove("miss"), 170);
  if (mistakes >= 5) {
    window.setTimeout(nextQuestion, 350);
  }
}

function nextQuestion() {
  currentQuestion += 1;
  progressFill.style.width = `${(currentQuestion / questions.length) * 100}%`;
  if (currentQuestion >= questions.length) {
    finishGame();
    return;
  }
  loadQuestion();
}

function finishGame() {
  clearLoops();
  window.clearInterval(timerId);
  window.speechSynthesis?.cancel();
  wordLane.innerHTML = "";
  showScreen("result");
  resultTitle.textContent = "成績計算中...";
  window.setTimeout(() => {
    const elapsed = Date.now() - startTime;
    const finalScore = Math.min(100, score);
    resultTitle.textContent = "挑戰完成";
    scoreText.textContent = finalScore;
    scoreRing.style.background = `radial-gradient(circle at center, #fff 0 54%, transparent 55%), conic-gradient(var(--leaf) ${finalScore * 3.6}deg, var(--sun) 0deg)`;
    resultMeta.textContent = `完成 ${completed.length} 題，用時 ${formatTime(elapsed)}`;
    renderRanks(finalScore, formatTime(elapsed));
  }, 650);
}

function renderRanks(finalScore, elapsed) {
  const allRanks = [["你", "Namoh", finalScore, elapsed], ...ranks].sort((a, b) => {
    if (b[2] !== a[2]) return b[2] - a[2];
    return String(a[3]).localeCompare(String(b[3]));
  });
  rankList.innerHTML = allRanks
    .slice(0, 8)
    .map((row, index) => {
      const rank = index + 1;
      return `
        <div class="rank-row">
          <span>${rank}</span>
          <span>${row[1]}</span>
          <span>${row[2]}</span>
          <span>${row[3]}</span>
        </div>
      `;
    })
    .join("");
}

function renderAnswers() {
  answersList.innerHTML = questions
    .map((question, index) => {
      const tokens = question.words
        .map((word, wordIndex) => `
          <div class="answer-token">
            <strong>${word}</strong>
            <span>${question.roman[wordIndex]}</span>
          </div>
        `)
        .join("");
      return `
        <div class="answer-item">
          <div class="answer-title">句子 ${index + 1}</div>
          <div class="answer-words">${tokens}</div>
          <p class="translation">${question.zh}</p>
        </div>
      `;
    })
    .join("");
}

nextStoryBtn.addEventListener("click", () => {
  storyIndex += 1;
  if (storyIndex >= storyLines.length) {
    showScreen("rules");
    return;
  }
  storyLine.textContent = storyLines[storyIndex];
});

skipStoryBtn.addEventListener("click", () => showScreen("rules"));
startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);
answersBtn.addEventListener("click", () => {
  renderAnswers();
  showScreen("answers");
});
closeAnswersBtn.addEventListener("click", () => showScreen("result"));
playPromptBtn.addEventListener("click", () => speak(questions[currentQuestion].words.join(" ")));
hitPanel.addEventListener("click", hitNearest);

soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  soundBtn.setAttribute("aria-pressed", String(soundOn));
  soundIcon.textContent = soundOn ? "♪" : "×";
  if (!soundOn) window.speechSynthesis?.cancel();
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && screens.game.classList.contains("screen-active")) {
    event.preventDefault();
    hitNearest();
  }
});

document.querySelectorAll(".dialect").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".dialect").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
  });
});

document.querySelector("#backBtn").addEventListener("click", () => showScreen("rules"));
renderRanks(0, "00:00:00.000");
