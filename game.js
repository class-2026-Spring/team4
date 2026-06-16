const quizProgress = document.getElementById("quiz-progress");
const quizScore = document.getElementById("quiz-score");
const quizIcon = document.getElementById("quiz-icon");
const quizItem = document.getElementById("quiz-item");
const quizQuestion = document.getElementById("quiz-question");
const feedbackPanel = document.getElementById("feedback-panel");
const feedbackResult = document.getElementById("feedback-result");
const feedbackText = document.getElementById("feedback-text");
const nextButton = document.getElementById("next-button");
const resultPanel = document.getElementById("result-panel");
const resultTitle = document.getElementById("result-title");
const resultSummary = document.getElementById("result-summary");
const reviewList = document.getElementById("review-list");
const restartButton = document.getElementById("restart-button");
const gameNotice = document.getElementById("game-notice");
const answerButtons = [...document.querySelectorAll(".ox-button")];

const itemIcons = {
  "플라스틱 빨대": "I",
  "깨끗한 비닐 포장재": "V",
  "오염된 비닐": "!",
  "투명 페트병": "P",
  "계란껍질": "E",
  "종이팩": "M",
  "깨진 유리컵": "G",
  "캔": "C",
};

let questions = [];
let currentIndex = 0;
let score = 0;
let answers = [];

fetch("data/recycling-quiz.json")
  .then((response) => response.json())
  .then((quizData) => {
    questions = quizData.questions;
    gameNotice.textContent = quizData.notice;
    renderQuestion();
  });

answerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const userAnswer = button.dataset.answer === "true";
    submitAnswer(userAnswer);
  });
});

nextButton.addEventListener("click", () => {
  currentIndex += 1;
  if (currentIndex >= questions.length) {
    renderResult();
    return;
  }
  renderQuestion();
});

restartButton.addEventListener("click", () => {
  currentIndex = 0;
  score = 0;
  answers = [];
  resultPanel.hidden = true;
  renderQuestion();
});

function renderQuestion() {
  const question = questions[currentIndex];
  feedbackPanel.hidden = true;
  answerButtons.forEach((button) => {
    button.disabled = false;
  });
  quizProgress.textContent = `${currentIndex + 1} / ${questions.length}`;
  quizScore.textContent = `${score}점`;
  quizIcon.textContent = itemIcons[question.item] ?? "?";
  quizItem.textContent = question.item;
  quizQuestion.textContent = question.statement;
}

function submitAnswer(userAnswer) {
  const question = questions[currentIndex];
  const isCorrect = userAnswer === question.answer;
  if (isCorrect) score += 1;
  answers.push({ ...question, userAnswer, isCorrect });

  answerButtons.forEach((button) => {
    button.disabled = true;
  });
  quizScore.textContent = `${score}점`;
  feedbackResult.textContent = isCorrect ? "정답" : "오답";
  feedbackResult.className = `feedback-result ${isCorrect ? "is-correct" : "is-wrong"}`;
  feedbackText.textContent = `${question.bin}: ${question.explanation}`;
  nextButton.textContent = currentIndex === questions.length - 1 ? "결과 보기" : "다음 문제";
  feedbackPanel.hidden = false;
}

function renderResult() {
  const percent = Math.round((score / questions.length) * 100);
  resultPanel.hidden = false;
  feedbackPanel.hidden = true;
  answerButtons.forEach((button) => {
    button.disabled = true;
  });
  resultTitle.textContent = `${score} / ${questions.length}개 정답`;
  resultSummary.textContent = `${percent}% 정답률입니다. 틀린 문제를 확인하고 다시 도전해보세요.`;
  reviewList.innerHTML = "";

  answers.forEach((answer) => {
    const item = document.createElement("article");
    item.className = `review-item ${answer.isCorrect ? "is-correct" : "is-wrong"}`;
    item.innerHTML = `
      <strong>${answer.item}</strong>
      <span>${answer.isCorrect ? "정답" : "오답"} · 정답은 ${answer.answer ? "O" : "X"}</span>
      <p>${answer.explanation}</p>
    `;
    reviewList.appendChild(item);
  });
}
