# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal workout-logging web app (see README.md for the full backstory and roadmap). It's a vanilla HTML/CSS/JS single-page app — no build step, no package manager, no dependencies. The user is early in learning JavaScript, so keep changes in plain JS matching the existing style rather than introducing frameworks, bundlers, or npm packages unless explicitly asked.

## Running it

There is no build/lint/test tooling in this repo. To run the app locally:

```
python3 -m http.server 8934
```

Then open `http://localhost:8934` in a browser. `index.html` can also be opened directly as a file, but serving it keeps `localStorage` behavior consistent with how it'll work once deployed.

To sanity-check `app.js` after edits (there is no linter configured):

```
node --check app.js
```

## Architecture

**Three screens, one page.** `index.html` defines three `<section class="screen">` blocks (`split-select-screen`, `workout-screen`, `logger-screen`). `app.js`'s `showScreen()` toggles a `.hidden` class to switch between them — there is no router or framework, just direct DOM manipulation.

**Data model** (persisted as one JSON blob in `localStorage` under the key `workoutTrackerData`, via `loadData()`/`saveData()` in `app.js`):

```
{
  exerciseLibrary: { Push: [...names], Pull: [...], Lower: [...], Upper: [...] },
  sessions: [
    { date: "YYYY-MM-DD", split: "Push", exercises: [
        { name, sets: [{ weight, reps }], completedAt }
    ]}
  ]
}
```

**Splits are labels, not fixed categories.** The `SPLIT_GROUPS` constant is the key piece of domain logic: `Upper` is defined as the union of `Push` + `Pull` (+ its own directly-added exercises), while `Push`/`Pull`/`Lower` only draw from themselves. `getExerciseChecklist(split)` uses this to decide which exercises to show as checkboxes for a given split — this is what lets "Upper Day" surface exercises logged under Push or Pull without duplicating data.

**A session is keyed by (date, split), not just date.** `findOrCreateSession()` looks up/creates a session by that pair, so logging two different splits on the same date produces two separate sessions.

**The session date is user-editable, not hardcoded to today.** `currentSessionDate` (set from the `#session-date-input` field, defaulting to today when a split is picked) is what actually gets used everywhere a session is looked up or saved — this is what lets you log or review a past day, not just today. Changing the split or the date both call `loadCheckedExercisesFromSession()`, which re-reads whatever's already saved for that exact (date, split) pair so previously-logged exercises correctly reappear as "Done" instead of looking empty just because the page reloaded.

**Exercises save independently, not the whole session at once.** Marking an exercise "Done" (`finish-exercise-btn` handler) immediately writes that one exercise into its session and calls `saveData()`. There's no separate "finish workout" step — this is intentional, so a mid-workout interruption doesn't lose earlier sets. Reopening an already-saved exercise from "today's plan" pre-fills the logger from storage and overwrites on save, which is how editing works.

**Deleting an exercise entry** (`deleteExercise()`) removes it from its session's `exercises` array, and drops the whole session if that was the last exercise in it. It uses the browser's native `confirm()` dialog to ask "are you sure" — fine for a real user tapping the button, but be aware `confirm()` blocks the page entirely, including automated browser-testing tools (clicking through it via CDP will hang/timeout). When testing this in an automated browser session, verify the logic by reading the code rather than clicking the delete button.

**Reps default to 10.** Sets are stored as `{ weight, reps }`; a set is assumed to be a completed default-rep set unless a lower rep count is explicitly entered (matching how the user tracks failed reps by hand, e.g. `15(6)` meaning failed at 6). `formatSets()` renders sets back into that same shorthand. `DEFAULT_REPS` in `app.js` is the single source of truth for the default.

**Progressive-overload baseline.** `getLastSets(exerciseName, beforeDate)` searches all sessions strictly before `beforeDate` for the most recent entry of a given exercise, so the logger screen can show "last time" numbers before entering today's (or a past date's) sets. It's always called with `currentSessionDate`, so "last time" is always relative to whatever date you're currently logging, not real-world today.

## Code style

This is the project owner's personal learning project (they're a beginner coder building this to learn, and to use in their portfolio) — not production code written on their behalf. Keep code plain and readable rather than reaching for senior-engineer patterns: skip premature helper functions, generic utilities, or defensive checks for situations that can't actually occur here.

## Development workflow

This repo uses the `dev-workflow` skill (`.claude/skills/dev-workflow/SKILL.md`) for every feature or bug fix: create a dedicated branch for the task, write the code per the style above, explain each created/changed file in plain English (what it does, what methods/DSA it uses, what's worth learning from it), update this file, then stop and let the project owner push/merge themselves rather than doing it automatically.

## Not yet implemented

Per README.md's roadmap: progress charts, PR detection, per-split volume tracking, time-based exercises (farmer's walks, bag work — these don't fit the `{weight, reps}` set shape and will need a different set structure), a real backend/database, and deployment.
