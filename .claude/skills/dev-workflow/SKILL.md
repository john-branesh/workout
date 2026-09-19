---
name: dev-workflow
description: This project's required workflow for every feature or bug fix - branch first, code beginner-style, explain each file in plain English, update CLAUDE.md, then hand off without pushing.
---

# Workout Tracker development workflow

Follow this process for every piece of work in this repository, whether it's a new feature or a bug fix. This exists because the project owner is a beginner coder using this repo both as a real daily tool and as a learning project, and wants to be taught as it grows, not just handed finished code.

## 1. Branch first

- Create a new git branch before starting any work.
- One branch per feature/task, or one branch per bug fix. Never mix a feature and a fix in the same branch, and never batch multiple unrelated features into one branch.
- Group together only the files that must change together for that one task — files that depend on each other to work belong in the same branch.

## 2. Write the code like a beginner would

- This is a personal learning project, not production code. Write plain, readable code: skip clever abstractions, generic helper functions, or defensive code for situations that can't actually happen.
- See the "Code style" note in CLAUDE.md before writing code, and keep new code consistent with it.

## 3. Explain every file you create or change

- After creating a file or making a substantial edit, explain it in plain English before moving on: what was built, which functions/methods were used and why, any data structures or algorithms (DSA) involved, and anything else genuinely worth learning from it.
- Keep jargon to a minimum, and define any technical term you do use — teach it the way you'd explain it to someone new to programming, not the way you'd write it in a technical spec.

## 4. Bump the cache-busting version if app.js or style.css changed

- `index.html` loads these as `app.js?v=N` and `style.css?v=N`. If a change touches either file, increment both `?v=` numbers in `index.html`. Skipping this means the project owner's phone/browser can keep silently running the old file after an update, which looks exactly like a bug that wasn't actually fixed.

## 5. Update CLAUDE.md

- Before finishing, update CLAUDE.md so it reflects the current state of the codebase: new files, changed architecture, new commands, or anything that would help a future session (or the project owner) understand the project quickly.

## 6. Stop and hand off — don't push or merge

- When the branch's work is complete, tell the user it's ready.
- Do not push or merge the branch. The user pushes and merges it themselves, unless they explicitly say to push/merge that specific branch. That approval doesn't carry over to future branches.
