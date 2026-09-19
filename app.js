const STORAGE_KEY = "workoutTrackerData";
const DEFAULT_REPS = 10;

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { exerciseLibrary: [], sessions: [] };
  }
  const parsed = JSON.parse(raw);

  // Older saved data kept a separate exercise list per split. Flatten it
  // into one shared list so every exercise lives in exactly one place.
  if (parsed.exerciseLibrary && !Array.isArray(parsed.exerciseLibrary)) {
    const flat = new Set();
    Object.values(parsed.exerciseLibrary).forEach((names) => names.forEach((n) => flat.add(n)));
    parsed.exerciseLibrary = Array.from(flat);
  }

  return parsed;
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

function getExerciseChecklist() {
  return [...data.exerciseLibrary].sort();
}

function addExerciseToLibrary(name) {
  if (!data.exerciseLibrary.includes(name)) {
    data.exerciseLibrary.push(name);
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
const manageScreen = document.getElementById("manage-screen");

function showScreen(screen) {
  [splitSelectScreen, workoutScreen, loggerScreen, manageScreen].forEach((s) => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

// ---------- Manage exercises (view / rename / delete - kept off the
// everyday selection screen so an accidental tap can't destroy anything) ----------
document.getElementById("manage-exercises-btn").addEventListener("click", () => {
  renderManageList();
  showScreen(manageScreen);
});

document.getElementById("manage-back-btn").addEventListener("click", () => {
  showScreen(splitSelectScreen);
});

function renderManageList() {
  const list = document.getElementById("manage-list");
  const emptyHint = document.getElementById("manage-empty");
  list.innerHTML = "";

  const names = getExerciseChecklist();
  emptyHint.classList.toggle("hidden", names.length > 0);

  names.forEach((name) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="manage-name">${name}</span>
      <span class="manage-actions">
        <button class="link-btn rename-btn">Rename</button>
        <button class="remove-set-btn delete-lib-btn" aria-label="Delete">&times;</button>
      </span>
    `;
    li.querySelector(".rename-btn").addEventListener("click", () => renameExercise(name));
    li.querySelector(".delete-lib-btn").addEventListener("click", () => deleteFromLibrary(name));
    list.appendChild(li);
  });
}

function renameExercise(oldName) {
  const input = prompt("Rename exercise to:", oldName);
  if (input === null) return;
  const newName = input.trim();
  if (!newName || newName === oldName) return;

  // De-duped with a Set: renaming into a name that already exists just
  // merges the two instead of creating a confusing duplicate entry.
  data.exerciseLibrary = Array.from(new Set(data.exerciseLibrary.map((n) => (n === oldName ? newName : n))));

  data.sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      if (exercise.name === oldName) exercise.name = newName;
    });
  });

  saveData();
  renderManageList();
}

function deleteFromLibrary(name) {
  const confirmed = confirm(
    `Remove "${name}" from your exercise list? This won't touch any workouts you've already logged under this name, but it will stop showing up as an option to pick.`
  );
  if (!confirmed) return;

  data.exerciseLibrary = data.exerciseLibrary.filter((n) => n !== name);
  saveData();
  renderManageList();
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
  getExerciseChecklist().forEach((name) => {
    const li = document.createElement("li");
    const checkboxId = `chk-${name.replace(/\s+/g, "-")}`;
    li.innerHTML = `
      <input type="checkbox" id="${checkboxId}" ${checkedExercises.has(name) ? "checked" : ""}>
      <label for="${checkboxId}">${name}</label>
    `;
    li.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) checkedExercises.add(name);
      else checkedExercises.delete(name);
      renderTodayPlan();
    });
    list.appendChild(li);
  });
}

document.getElementById("add-exercise-btn").addEventListener("click", () => {
  const input = document.getElementById("new-exercise-input");
  const name = input.value.trim();
  if (!name) return;
  addExerciseToLibrary(name);
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

  addExerciseToLibrary(activeExerciseName);
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
