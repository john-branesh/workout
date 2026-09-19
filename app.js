const STORAGE_KEY = "workoutTrackerData";
const DEFAULT_REPS = 10;

// Upper day pulls its exercise list from Push + Pull history.
// Push, Pull, and Lower only ever pull from themselves.
const SPLIT_GROUPS = {
  Push: ["Push"],
  Pull: ["Pull"],
  Lower: ["Lower"],
  Upper: ["Push", "Pull", "Upper"],
};

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      exerciseLibrary: { Push: [], Pull: [], Lower: [], Upper: [] },
      sessions: [],
    };
  }
  return JSON.parse(raw);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = loadData();

// Transient state for whatever screen is currently open. None of this is
// saved to storage until an exercise is marked "Done".
let currentSplit = null;
let currentSessionDate = null;
let checkedExercises = new Set();
let activeExerciseName = null;
let activeSets = [];

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function findOrCreateSession(dateISO, split) {
  let session = data.sessions.find((s) => s.date === dateISO && s.split === split);
  if (!session) {
    session = { date: dateISO, split, exercises: [] };
    data.sessions.push(session);
  }
  return session;
}

function getExerciseChecklist(split) {
  const groups = SPLIT_GROUPS[split];
  const names = new Set();
  groups.forEach((g) => (data.exerciseLibrary[g] || []).forEach((n) => names.add(n)));
  return Array.from(names).sort();
}

function addExerciseToLibrary(split, name) {
  if (!data.exerciseLibrary[split].includes(name)) {
    data.exerciseLibrary[split].push(name);
  }
}

function getLastSets(exerciseName, beforeDate) {
  const matches = data.sessions
    .filter((s) => s.date < beforeDate)
    .flatMap((s) => s.exercises.filter((e) => e.name === exerciseName).map((e) => ({ date: s.date, sets: e.sets })));
  if (matches.length === 0) return null;
  matches.sort((a, b) => (a.date < b.date ? 1 : -1));
  return matches[0];
}

function formatSets(sets) {
  return sets
    .map((s) => (s.reps === DEFAULT_REPS ? `${s.weight}` : `${s.weight}(${s.reps})`))
    .join(" + ");
}

// ---------- Screen elements ----------
const splitSelectScreen = document.getElementById("split-select-screen");
const workoutScreen = document.getElementById("workout-screen");
const loggerScreen = document.getElementById("logger-screen");

function showScreen(screen) {
  [splitSelectScreen, workoutScreen, loggerScreen].forEach((s) => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

// ---------- Split select ----------
document.querySelectorAll(".split-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentSplit = btn.dataset.split;
    currentSessionDate = todayISO();
    document.getElementById("session-date-input").value = currentSessionDate;
    document.getElementById("workout-screen-title").textContent = `${currentSplit} Day`;
    loadCheckedExercisesFromSession();
    renderChecklist();
    renderTodayPlan();
    showScreen(workoutScreen);
  });
});

document.getElementById("change-split-btn").addEventListener("click", () => {
  showScreen(splitSelectScreen);
});

document.getElementById("session-date-input").addEventListener("change", (e) => {
  currentSessionDate = e.target.value;
  loadCheckedExercisesFromSession();
  renderChecklist();
  renderTodayPlan();
});

// Whenever we land on a (date, split) pair, whatever was already saved for
// it should show up checked and marked "Done" right away - not just
// whatever you happened to have ticked earlier in this browser session.
function loadCheckedExercisesFromSession() {
  const session = findOrCreateSessionReadOnly();
  checkedExercises = new Set(session ? session.exercises.map((e) => e.name) : []);
}

// ---------- Checklist + today's plan ----------
function renderChecklist() {
  const list = document.getElementById("exercise-checklist");
  list.innerHTML = "";
  getExerciseChecklist(currentSplit).forEach((name) => {
    const li = document.createElement("li");
    const checkboxId = `chk-${name.replace(/\s+/g, "-")}`;
    li.innerHTML = `
      <span class="checklist-left">
        <input type="checkbox" id="${checkboxId}" ${checkedExercises.has(name) ? "checked" : ""}>
        <label for="${checkboxId}">${name}</label>
      </span>
      <button class="remove-set-btn remove-exercise-btn" aria-label="Remove from list">&times;</button>
    `;
    li.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) checkedExercises.add(name);
      else checkedExercises.delete(name);
      renderTodayPlan();
    });
    li.querySelector(".remove-exercise-btn").addEventListener("click", () => {
      removeExerciseFromLibrary(name);
    });
    list.appendChild(li);
  });
}

function removeExerciseFromLibrary(name) {
  // Upper's checklist is a mix of Push + Pull + its own list, so we don't
  // know which bucket this name actually came from - just try all of them.
  SPLIT_GROUPS[currentSplit].forEach((group) => {
    data.exerciseLibrary[group] = data.exerciseLibrary[group].filter((n) => n !== name);
  });
  checkedExercises.delete(name);
  saveData();
  renderChecklist();
  renderTodayPlan();
}

document.getElementById("add-exercise-btn").addEventListener("click", () => {
  const input = document.getElementById("new-exercise-input");
  const name = input.value.trim();
  if (!name) return;
  addExerciseToLibrary(currentSplit, name);
  checkedExercises.add(name);
  saveData();
  input.value = "";
  renderChecklist();
  renderTodayPlan();
});

function getSavedExercise(name) {
  const session = findOrCreateSessionReadOnly();
  if (!session) return null;
  return session.exercises.find((e) => e.name === name) || null;
}

function findOrCreateSessionReadOnly() {
  return data.sessions.find((s) => s.date === currentSessionDate && s.split === currentSplit) || null;
}

function renderTodayPlan() {
  const list = document.getElementById("today-plan");
  const emptyHint = document.getElementById("today-plan-empty");
  list.innerHTML = "";

  const names = Array.from(checkedExercises).sort();
  emptyHint.classList.toggle("hidden", names.length > 0);

  names.forEach((name) => {
    const saved = getSavedExercise(name);
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${name}</span>
      <span class="plan-right">
        <span class="plan-status ${saved ? "done" : ""}">${saved ? "Done" : "Not started"}</span>
        <button class="remove-set-btn delete-plan-btn" aria-label="Remove">&times;</button>
      </span>
    `;
    li.addEventListener("click", () => openLogger(name));
    li.querySelector(".delete-plan-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      if (saved) {
        deleteExercise(name);
      } else {
        checkedExercises.delete(name);
        renderChecklist();
        renderTodayPlan();
      }
    });
    list.appendChild(li);
  });
}

function deleteExercise(name) {
  const confirmed = confirm(`Delete "${name}" from this session? This can't be undone.`);
  if (!confirmed) return;

  const session = findOrCreateSessionReadOnly();
  if (!session) return;

  session.exercises = session.exercises.filter((e) => e.name !== name);
  if (session.exercises.length === 0) {
    data.sessions = data.sessions.filter((s) => s !== session);
  }

  checkedExercises.delete(name);
  saveData();
  renderChecklist();
  renderTodayPlan();
}

// ---------- Exercise logger ----------
function openLogger(name) {
  activeExerciseName = name;
  const saved = getSavedExercise(name);

  if (saved) {
    activeSets = saved.sets.map((s) => ({ ...s }));
  } else {
    activeSets = [{ weight: "", reps: DEFAULT_REPS }];
  }

  document.getElementById("logger-exercise-name").textContent = name;

  const last = getLastSets(name, currentSessionDate);
  const lastTimeEl = document.getElementById("logger-last-time");
  if (last) {
    lastTimeEl.textContent = `Last time (${last.date}): ${formatSets(last.sets)}`;
  } else {
    lastTimeEl.textContent = "No previous record for this exercise yet — this is your first one.";
  }

  renderSetList();
  showScreen(loggerScreen);
}

function renderSetList() {
  const list = document.getElementById("set-list");
  list.innerHTML = "";
  activeSets.forEach((set, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="set-number">${i + 1}</span>
      <div class="set-field">
        <label>Weight (kg)</label>
        <input type="number" step="0.5" class="weight-input" value="${set.weight}">
      </div>
      <div class="set-field">
        <label>Reps</label>
        <input type="number" class="reps-input" value="${set.reps}">
      </div>
      <button class="remove-set-btn" aria-label="Remove set">&times;</button>
    `;
    li.querySelector(".weight-input").addEventListener("input", (e) => {
      activeSets[i].weight = e.target.value === "" ? "" : Number(e.target.value);
    });
    li.querySelector(".reps-input").addEventListener("input", (e) => {
      activeSets[i].reps = e.target.value === "" ? "" : Number(e.target.value);
    });
    li.querySelector(".remove-set-btn").addEventListener("click", () => {
      activeSets.splice(i, 1);
      renderSetList();
    });
    list.appendChild(li);
  });
}

document.getElementById("add-set-btn").addEventListener("click", () => {
  activeSets.push({ weight: "", reps: DEFAULT_REPS });
  renderSetList();
});

document.getElementById("logger-back-btn").addEventListener("click", () => {
  showScreen(workoutScreen);
});

document.getElementById("finish-exercise-btn").addEventListener("click", () => {
  const cleanSets = activeSets
    .filter((s) => s.weight !== "" && s.weight !== null)
    .map((s) => ({ weight: Number(s.weight), reps: s.reps === "" ? DEFAULT_REPS : Number(s.reps) }));

  if (cleanSets.length === 0) {
    alert("Add at least one set with a weight before finishing.");
    return;
  }

  const session = findOrCreateSession(currentSessionDate, currentSplit);
  const existing = session.exercises.find((e) => e.name === activeExerciseName);
  if (existing) {
    existing.sets = cleanSets;
    existing.completedAt = new Date().toISOString();
  } else {
    session.exercises.push({
      name: activeExerciseName,
      sets: cleanSets,
      completedAt: new Date().toISOString(),
    });
  }

  addExerciseToLibrary(currentSplit, activeExerciseName);
  saveData();
  renderTodayPlan();
  showScreen(workoutScreen);
});

// ---------- Init ----------
document.getElementById("today-date").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});
