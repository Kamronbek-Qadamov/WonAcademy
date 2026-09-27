/**
 * GrammarPro - Core Platform Engine
 * Manages Routing, JSON Loading, LocalStorage, Audio Speech, Quizzes and Certificate.
 */

// Application State
let appData = {
  lessons: [],
  flashcards: []
};

let userState = {
  name: 'Foydalanuvchi',
  completedLessons: [], // Store completed lesson IDs
  score: 0
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  fetchData();
  setupEventListeners();
});

// Load User Progress from LocalStorage
function loadUserData() {
  const savedUser = localStorage.getItem('grammarpro_user');
  if (savedUser) {
    userState = JSON.parse(savedUser);
  }
  updateUserUI();
}

// Save User Progress to LocalStorage
function saveUserData() {
  localStorage.setItem('grammarpro_user', JSON.stringify(userState));
  updateUserUI();
}

// Fetch Lessons and Flashcards Data from JSON
async function fetchData() {
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error('data.json yuklanishida xatolik yuz berdi');
    appData = await response.json();

    renderLessons('all');
    renderFlashcards();
    updateUserUI();
  } catch (error) {
    console.error('Error fetching JSON data:', error);
  }
}

// Navigation / Tab Switcher
function switchTab(tabId) {
  const tabs = document.querySelectorAll('.tab-content');
  const navLinks = document.querySelectorAll('.nav-link');

  tabs.forEach(tab => tab.classList.remove('active'));
  navLinks.forEach(link => link.classList.remove('active'));

  const selectedTab = document.getElementById(`${tabId}-section`);
  if (selectedTab) selectedTab.classList.add('active');

  // Activate navbar link highlight
  const activeLink = Array.from(navLinks).find(link => link.getAttribute('onclick')?.includes(tabId));
  if (activeLink) activeLink.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Render Lessons Grid
function renderLessons(filterLevel = 'all') {
  const grid = document.getElementById('lessonsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = filterLevel === 'all'
    ? appData.lessons
    : appData.lessons.filter(l => l.level.startsWith(filterLevel));

  filtered.forEach(lesson => {
    const isDone = userState.completedLessons.includes(lesson.id);
    const card = document.createElement('div');
    card.className = 'lesson-card';
    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="level-tag">${lesson.level}</span>
          ${isDone ? '<i class="fa-solid fa-circle-check completed-badge"></i>' : ''}
        </div>
        <h3>${lesson.lessonNumber}-Dars: ${lesson.title}</h3>
        <p>${lesson.explanation.substring(0, 90)}...</p>
      </div>
      <button class="btn btn-primary" onclick="openLesson('${lesson.id}')">
        <i class="fa-solid fa-book-open"></i> Darsni Boshlash
      </button>
    `;
    grid.appendChild(card);
  });
}

// Open Specific Lesson Details and Quizzes
function openLesson(lessonId) {
  const lesson = appData.lessons.find(l => l.id === lessonId);
  if (!lesson) return;

  const container = document.getElementById('lessonDetailContainer');
  container.innerHTML = `
    <div class="detail-header">
      <span class="level-tag">${lesson.level}</span>
      <h1>${lesson.lessonNumber}-Dars: ${lesson.title}</h1>
      <p>${lesson.explanation}</p>
    </div>

    <div class="rule-box">
      <h4><i class="fa-solid fa-lightbulb"></i> Qoida (Rule):</h4>
      <p><em>${lesson.rule}</em></p>
    </div>

    <div class="formula-box">
      <h4><i class="fa-solid fa-code"></i> Formula & Structure:</h4>
      <p><code>${lesson.formula}</code></p>
    </div>

    <h4>Signal So'zlar (Signal Words):</h4>
    <div class="signal-tags">
      ${lesson.signalWords.map(word => `<span class="signal-chip">${word}</span>`).join('')}
    </div>

    <h4>Misollar va Talaffuz:</h4>
    <div class="examples-list">
      ${lesson.examples.map(ex => `
        <div class="example-item">
          <div>
            <strong>${ex.en}</strong>
            <br><small style="color:var(--text-muted);">${ex.uz}</small>
          </div>
          <button class="audio-btn" onclick="speakText('${ex.en.replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-volume-high"></i>
          </button>
        </div>
      `).join('')}
    </div>

    <!-- Quiz Area -->
    <div class="quiz-wrapper">
      <h2><i class="fa-solid fa-pen-to-square"></i> Mustahkamlash Testlari</h2>
      <div id="quizContainer">
        ${renderQuizzes(lesson.quiz, lesson.id)}
      </div>
    </div>
  `;

  switchTab('lesson-detail');
}

// Render Quizzes inside Lesson Detail
function renderQuizzes(quizzes, lessonId) {
  return quizzes.map((q, index) => {
    if (q.type === 'multiple_choice') {
      return `
        <div class="quiz-card" id="quiz-card-${q.id}">
          <p><strong>${index + 1}. ${q.questionUz}</strong></p>
          <div class="options-group">
            ${q.options.map(opt => `
              <button class="option-btn" onclick="checkQuizAnswer('${lessonId}', '${q.id}', '${opt}', '${q.answer}')">
                ${opt}
              </button>
            `).join('')}
          </div>
          <div id="feedback-${q.id}" class="mt-3"></div>
        </div>
      `;
    } else if (q.type === 'fill_in') {
      return `
        <div class="quiz-card" id="quiz-card-${q.id}">
          <p><strong>${index + 1}. ${q.questionUz}</strong></p>
          <div style="display:flex; gap:0.5rem; margin-top:1rem;">
            <input type="text" class="custom-input" id="input-${q.id}" placeholder="Javobingizni yozing...">
            <button class="btn btn-primary" onclick="checkFillInAnswer('${lessonId}', '${q.id}', '${q.answer}')">Tekshirish</button>
          </div>
          <div id="feedback-${q.id}" class="mt-3"></div>
        </div>
      `;
    }
  }).join('');
}

// Check Multiple Choice Quiz
function checkQuizAnswer(lessonId, quizId, selectedOption, correctAnswer) {
  const feedbackEl = document.getElementById(`feedback-${quizId}`);
  if (selectedOption.toLowerCase() === correctAnswer.toLowerCase()) {
    feedbackEl.innerHTML = `<span style="color:var(--accent-green);"><i class="fa-solid fa-circle-check"></i> To'g'ri! Barakalla.</span>`;
    markLessonComplete(lessonId);
  } else {
    feedbackEl.innerHTML = `<span style="color:var(--accent-red);"><i class="fa-solid fa-circle-xmark"></i> Noto'g'ri. To'g'ri javob: <strong>${correctAnswer}</strong></span>`;
  }
}

// Check Fill In Answer
function checkFillInAnswer(lessonId, quizId, correctAnswer) {
  const userVal = document.getElementById(`input-${quizId}`).value.trim();
  const feedbackEl = document.getElementById(`feedback-${quizId}`);

  if (userVal.toLowerCase() === correctAnswer.toLowerCase()) {
    feedbackEl.innerHTML = `<span style="color:var(--accent-green);"><i class="fa-solid fa-circle-check"></i> Ajoyib! To'g'ri javob.</span>`;
    markLessonComplete(lessonId);
  } else {
    feedbackEl.innerHTML = `<span style="color:var(--accent-red);"><i class="fa-solid fa-circle-xmark"></i> Noto'g'ri. To'g'ri javob: <strong>${correctAnswer}</strong></span>`;
  }
}

// Mark Lesson as Completed
function markLessonComplete(lessonId) {
  if (!userState.completedLessons.includes(lessonId)) {
    userState.completedLessons.push(lessonId);
    userState.score += 50;
    saveUserData();
    renderLessons();
  }
}

// Text-to-Speech Web Speech API
function speakText(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } else {
    alert('Kechirasiz, brauzeringizda audio o\'qish funksiyasi qo\'llab-quvvatlanmaydi.');
  }
}

// Render Flashcards
function renderFlashcards() {
  const container = document.getElementById('flashcardsContainer');
  if (!container) return;
  container.innerHTML = '';

  appData.flashcards.forEach(fc => {
    const card = document.createElement('div');
    card.className = 'flashcard';
    card.onclick = () => card.classList.toggle('flipped');
    card.innerHTML = `
      <div class="flashcard-inner">
        <div class="fc-front">
          <i class="fa-solid fa-bolt" style="margin-bottom:0.5rem; opacity:0.6;"></i>
          ${fc.term}
        </div>
        <div class="fc-back">
          <p>${fc.definitionUz}</p>
          <small style="margin-top:0.75rem; color:var(--accent-cyan);">${fc.example}</small>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Save User Profile Changes
function saveUserProfile() {
  const input = document.getElementById('usernameInput');
  if (input && input.value.trim() !== '') {
    userState.name = input.value.trim();
    saveUserData();
    alert('Profil ma\'lumotlari muvaffaqiyatli saqlandi!');
  }
}

// Update User Stats & Certificate UI
function updateUserUI() {
  const navUser = document.getElementById('navUserName');
  const input = document.getElementById('usernameInput');
  const certName = document.getElementById('certStudentName');
  const statCompleted = document.getElementById('statCompletedLessons');
  const statScore = document.getElementById('statTotalScore');
  const progressPercentText = document.getElementById('progressPercentText');
  const profileProgressBar = document.getElementById('profileProgressBar');

  if (navUser) navUser.innerText = userState.name;
  if (input) input.value = userState.name;
  if (certName) certName.innerText = userState.name;
  if (statCompleted) statCompleted.innerText = userState.completedLessons.length;
  if (statScore) statScore.innerText = userState.score;

  const totalLessons = appData.lessons.length || 1;
  const percent = Math.min(Math.round((userState.completedLessons.length / totalLessons) * 100), 100);

  if (progressPercentText) progressPercentText.innerText = `${percent}%`;
  if (profileProgressBar) profileProgressBar.style.width = `${percent}%`;
}

// Event Listeners Setup
function setupEventListeners() {
  // Filter level buttons listener
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const level = e.target.getAttribute('data-level');
      renderLessons(level);
    });
  });
}

