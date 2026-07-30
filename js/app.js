/* ============================================================
   LIFE DASHBOARD — app.js
   Features:
     - Greeting with time & date (updates every second)
     - Custom name stored in LocalStorage
     - Light / Dark mode toggle (stored in LocalStorage)
     - Focus Timer: start / stop / reset + custom Pomodoro minutes
     - To-Do List: add, edit, check, delete, prevent duplicates, sort
     - Quick Links: add, open, delete (with favicon)
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────
   STORAGE HELPERS
───────────────────────────────────────── */
const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage write failed:', e);
    }
  },
};

/* ─────────────────────────────────────────
   DOM REFERENCES
───────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const greetingEl      = $('greeting');
const datetimeEl      = $('datetime');
const btnTheme        = $('btn-theme');
const btnName         = $('btn-name');

const timerDisplay    = $('timer-display');
const timerCard       = $('timer-card');
const btnStart        = $('btn-start');
const btnStop         = $('btn-stop');
const btnReset        = $('btn-reset');
const pomodoroInput   = $('pomodoro-minutes');
const btnSetTime      = $('btn-set-time');

const todoForm        = $('todo-form');
const todoInput       = $('todo-input');
const todoListEl      = $('todo-list');
const todoEmpty       = $('todo-empty');
const sortSelect      = $('sort-select');

const linkForm        = $('link-form');
const linkNameInput   = $('link-name');
const linkUrlInput    = $('link-url');
const linksGrid       = $('links-grid');
const linksEmpty      = $('links-empty');

const nameModal       = $('name-modal');
const nameInput       = $('name-input');
const modalSave       = $('modal-save');
const modalCancel     = $('modal-cancel');

/* ─────────────────────────────────────────
   1. GREETING & DATE/TIME
───────────────────────────────────────── */
function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function formatDate(now) {
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

function formatTime(now) {
  return now.toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function updateClock() {
  const now  = new Date();
  const hour = now.getHours();
  const name = store.get('userName', '');
  const namePart = name ? `, ${name}` : '';

  greetingEl.textContent = `${getGreeting(hour)}${namePart} 👋`;
  datetimeEl.textContent = `${formatDate(now)} · ${formatTime(now)}`;
}

// Kick off immediately and keep in sync every second
updateClock();
setInterval(updateClock, 1000);

/* ─────────────────────────────────────────
   2. DARK / LIGHT MODE  (Challenge #1)
───────────────────────────────────────── */
const html = document.documentElement;

function applyTheme(dark) {
  html.setAttribute('data-theme', dark ? 'dark' : 'light');
  btnTheme.textContent = dark ? '☀️' : '🌙';
  btnTheme.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
}

let isDark = store.get('darkMode', false);
applyTheme(isDark);

btnTheme.addEventListener('click', () => {
  isDark = !isDark;
  store.set('darkMode', isDark);
  applyTheme(isDark);
});

/* ─────────────────────────────────────────
   3. CUSTOM NAME  (Challenge #2)
───────────────────────────────────────── */
function openNameModal() {
  nameInput.value = store.get('userName', '');
  nameModal.classList.remove('hidden');
  nameInput.focus();
}

function closeNameModal() {
  nameModal.classList.add('hidden');
}

btnName.addEventListener('click', openNameModal);
modalCancel.addEventListener('click', closeNameModal);

modalSave.addEventListener('click', () => {
  const name = nameInput.value.trim();
  store.set('userName', name);
  closeNameModal();
  updateClock(); // Reflect immediately
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  modalSave.click();
  if (e.key === 'Escape') closeNameModal();
});

// Close on backdrop click
nameModal.addEventListener('click', (e) => {
  if (e.target === nameModal) closeNameModal();
});

// Auto-open name modal on first visit
if (!store.get('userName', null)) {
  openNameModal();
}

/* ─────────────────────────────────────────
   4. FOCUS TIMER  (Change Pomodoro time = Challenge #3)
───────────────────────────────────────── */
let pomodoroMinutes = store.get('pomodoroMinutes', 25);
let totalSeconds    = pomodoroMinutes * 60;
let remainingSeconds = totalSeconds;
let timerInterval   = null;
let timerRunning    = false;

pomodoroInput.value = pomodoroMinutes;

function pad(n) {
  return String(n).padStart(2, '0');
}

function renderTimer() {
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  timerDisplay.textContent = `${pad(m)}:${pad(s)}`;

  // Update browser tab title when timer is running
  if (timerRunning) {
    document.title = `⏱ ${pad(m)}:${pad(s)} — Life Dashboard`;
  } else {
    document.title = 'Life Dashboard';
  }
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerCard.classList.add('timer-running');
  btnStart.disabled = true;

  timerInterval = setInterval(() => {
    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerCard.classList.remove('timer-running');
      btnStart.disabled = false;
      document.title = 'Life Dashboard';
      timerDisplay.textContent = '00:00';
      showToast('⏰ Time is up! Great focus session!', '#38a169');
      return;
    }
    remainingSeconds--;
    renderTimer();
  }, 1000);
}

function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  timerCard.classList.remove('timer-running');
  btnStart.disabled = false;
  document.title = 'Life Dashboard';
}

function resetTimer() {
  stopTimer();
  remainingSeconds = totalSeconds;
  renderTimer();
}

btnStart.addEventListener('click', startTimer);
btnStop.addEventListener('click',  stopTimer);
btnReset.addEventListener('click', resetTimer);

// Set custom Pomodoro minutes (Challenge #3)
btnSetTime.addEventListener('click', () => {
  const val = parseInt(pomodoroInput.value, 10);
  if (isNaN(val) || val < 1 || val > 120) {
    showToast('Enter a value between 1 and 120 minutes.', '#e53e3e');
    return;
  }
  pomodoroMinutes  = val;
  totalSeconds     = val * 60;
  remainingSeconds = totalSeconds;
  store.set('pomodoroMinutes', pomodoroMinutes);
  stopTimer();
  renderTimer();
  showToast(`✅ Timer set to ${val} minute${val > 1 ? 's' : ''}.`, '#38a169');
});

// Init display
renderTimer();

/* ─────────────────────────────────────────
   5. TO-DO LIST
   Challenges covered:
     #4 — Prevent duplicate tasks
     #5 — Sort tasks
───────────────────────────────────────── */
let tasks = store.get('tasks', []);

/** Normalise for duplicate check */
function normalise(str) {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

function saveTasks() {
  store.set('tasks', tasks);
}

function getSortedTasks() {
  const mode = sortSelect.value;
  const copy = [...tasks];
  if (mode === 'az')   copy.sort((a, b) => a.text.localeCompare(b.text));
  if (mode === 'za')   copy.sort((a, b) => b.text.localeCompare(a.text));
  if (mode === 'done') copy.sort((a, b) => Number(a.done) - Number(b.done));
  return copy;
}

function renderTasks() {
  todoListEl.innerHTML = '';
  const sorted = getSortedTasks();

  todoEmpty.style.display = tasks.length === 0 ? 'block' : 'none';

  sorted.forEach((task) => {
    const li = document.createElement('li');
    li.className = `todo-item${task.done ? ' done' : ''}`;
    li.dataset.id = task.id;

    // ── Checkbox
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'todo-checkbox';
    cb.checked = task.done;
    cb.setAttribute('aria-label', 'Mark task as done');
    cb.addEventListener('change', () => toggleTask(task.id));

    // ── Text (contenteditable for inline edit)
    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = task.text;
    span.setAttribute('role', 'textbox');
    span.setAttribute('aria-label', 'Task text');

    // ── Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'todo-btn edit';
    editBtn.title = 'Edit task';
    editBtn.textContent = '✏️';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.addEventListener('click', () => startEdit(task.id, span, editBtn));

    // ── Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'todo-btn delete';
    delBtn.title = 'Delete task';
    delBtn.textContent = '🗑️';
    delBtn.setAttribute('aria-label', 'Delete task');
    delBtn.addEventListener('click', () => deleteTask(task.id));

    const actions = document.createElement('div');
    actions.className = 'todo-actions';
    actions.append(editBtn, delBtn);

    li.append(cb, span, actions);
    todoListEl.appendChild(li);
  });
}

function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  // Challenge #4 — Prevent duplicates
  const isDuplicate = tasks.some(
    (t) => normalise(t.text) === normalise(trimmed)
  );
  if (isDuplicate) {
    showToast('⚠️ Task already exists!', '#e53e3e');
    return;
  }

  tasks.push({ id: Date.now(), text: trimmed, done: false });
  saveTasks();
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.done = !task.done;
    saveTasks();
    renderTasks();
  }
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
}

/** Inline edit — toggle contenteditable on the span */
function startEdit(id, span, btn) {
  const isEditing = span.contentEditable === 'true';

  if (isEditing) {
    // Save
    const newText = span.textContent.trim();
    if (!newText) {
      showToast('Task text cannot be empty.', '#e53e3e');
      span.textContent = tasks.find((t) => t.id === id)?.text || '';
      span.contentEditable = 'false';
      btn.textContent = '✏️';
      return;
    }

    // Check duplicate (excluding self)
    const isDuplicate = tasks.some(
      (t) => t.id !== id && normalise(t.text) === normalise(newText)
    );
    if (isDuplicate) {
      showToast('⚠️ Another task with that name already exists!', '#e53e3e');
      span.textContent = tasks.find((t) => t.id === id)?.text || '';
      span.contentEditable = 'false';
      btn.textContent = '✏️';
      return;
    }

    const task = tasks.find((t) => t.id === id);
    if (task) task.text = newText;
    saveTasks();
    span.contentEditable = 'false';
    btn.textContent = '✏️';
    btn.title = 'Edit task';
  } else {
    // Enter edit mode
    span.contentEditable = 'true';
    span.focus();

    // Move cursor to end
    const range = document.createRange();
    range.selectNodeContents(span);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    btn.textContent = '💾';
    btn.title = 'Save task';

    // Save on Enter, cancel on Escape
    span.addEventListener('keydown', function handler(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        span.removeEventListener('keydown', handler);
        startEdit(id, span, btn);
      }
      if (e.key === 'Escape') {
        span.removeEventListener('keydown', handler);
        span.textContent = tasks.find((t) => t.id === id)?.text || '';
        span.contentEditable = 'false';
        btn.textContent = '✏️';
        btn.title = 'Edit task';
      }
    });
  }
}

todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addTask(todoInput.value);
  todoInput.value = '';
  todoInput.focus();
});

sortSelect.addEventListener('change', renderTasks);

// Initial render
renderTasks();

/* ─────────────────────────────────────────
   6. QUICK LINKS
───────────────────────────────────────── */
let links = store.get('quickLinks', []);

function saveLinks() {
  store.set('quickLinks', links);
}

/** Extract a clean favicon URL from any given URL */
function getFaviconUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
  } catch {
    return null;
  }
}

/** Ensure URL has a protocol */
function normaliseUrl(raw) {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function renderLinks() {
  linksGrid.innerHTML = '';
  linksEmpty.style.display = links.length === 0 ? 'block' : 'none';

  links.forEach((link) => {
    const item = document.createElement('div');
    item.className = 'link-item';

    const a = document.createElement('a');
    a.className = 'link-btn';
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = link.url;

    const favicon = getFaviconUrl(link.url);
    if (favicon) {
      const img = document.createElement('img');
      img.src = favicon;
      img.className = 'link-favicon';
      img.alt = '';
      img.onerror = () => img.remove(); // Hide broken favicons
      a.appendChild(img);
    }

    const label = document.createElement('span');
    label.textContent = link.name;
    a.appendChild(label);

    const delBtn = document.createElement('button');
    delBtn.className = 'link-delete';
    delBtn.textContent = '✕';
    delBtn.title = `Remove ${link.name}`;
    delBtn.setAttribute('aria-label', `Remove ${link.name}`);
    delBtn.addEventListener('click', () => deleteLink(link.id));

    item.append(a, delBtn);
    linksGrid.appendChild(item);
  });
}

function addLink(name, url) {
  const trimmedName = name.trim();
  const trimmedUrl  = normaliseUrl(url);

  if (!trimmedName || !trimmedUrl) return;

  links.push({ id: Date.now(), name: trimmedName, url: trimmedUrl });
  saveLinks();
  renderLinks();
}

function deleteLink(id) {
  links = links.filter((l) => l.id !== id);
  saveLinks();
  renderLinks();
}

linkForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = linkNameInput.value.trim();
  const url  = linkUrlInput.value.trim();

  if (!name) {
    showToast('Please enter a link name.', '#e53e3e');
    linkNameInput.focus();
    return;
  }
  if (!url) {
    showToast('Please enter a URL.', '#e53e3e');
    linkUrlInput.focus();
    return;
  }

  addLink(name, url);
  linkNameInput.value = '';
  linkUrlInput.value  = '';
  linkNameInput.focus();
});

// Initial render
renderLinks();

/* ─────────────────────────────────────────
   7. TOAST NOTIFICATIONS
───────────────────────────────────────── */
let toastTimeout = null;

function showToast(message, color = '#e53e3e') {
  // Remove existing toast if visible
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.background = color;
  document.body.appendChild(toast);

  toastTimeout = setTimeout(() => {
    toast.style.transition = 'opacity .3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 320);
  }, 3000);
}
