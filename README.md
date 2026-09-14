# Workout Tracker

A simple app I'm building to log my daily gym workouts — weights, reps, and sets — so I can actually see whether I'm getting stronger instead of guessing.

## Why I built this

I train 5 days a week and was tracking everything in random phone notes, like:

```
Bench press: 7.5 + 10 + 12.5 + 15 (6) + 17.5 (5)
```

That works fine for writing things down, but it's useless for actually seeing progress. I couldn't easily tell if I was improving on an exercise, or compare one week to the next. So instead of downloading a random fitness app, I decided to build my own — one that fits exactly how I train, and to get real practice building a full app instead of just following a tutorial.

## How I train (so the app makes sense)

I don't follow a fixed weekly schedule. Every day I decide for myself which of these 4 splits I'm doing:

- **Push**
- **Pull**
- **Lower** (legs)
- **Upper** (a mix of push and pull exercises)

Because "Upper" overlaps with Push and Pull, the app doesn't treat splits as strict, separate categories — it treats them more like labels. Selecting "Upper" just shows me every exercise I've ever logged under Push or Pull, combined.

## What it does right now

- Pick which split you're training today
- See a checklist of exercises already logged under that split, so you're not starting from a blank page
- Add a brand-new exercise any time it's not in the list yet
- Log as many sets as you want per exercise — weight in kg, reps default to 10, and I only type a number in if I failed a set early (matching how I already wrote things down by hand)
- Each exercise saves itself the moment I mark it "Done" — not the whole workout at once — so nothing gets lost if I close the app mid-session
- Edit any set afterward if I logged a wrong number

## What's coming next

- A progress screen: line charts showing weight trends per exercise, over time
- Automatic personal record (PR) detection
- Total weight moved ("volume") per split, so I can see effort trends day to day
- Support for time-based exercises like farmer's walks and heavy bag work, which don't fit the weight-and-reps shape
- A real backend and database, so my data isn't stuck in one phone's browser
- Deploying it live, so it's an actual website and not just something running on my laptop

## How it's built

Right now it's plain **HTML, CSS, and JavaScript** — no frameworks, no build tools, nothing to install. All data is saved using the browser's **localStorage**, which is basically a small storage box built into every browser that remembers data even after you close the tab. It's a good starting point while I'm still learning, and it'll be replaced by a real database once the basics are solid.

## How to run it

1. Clone this repo
2. From the project folder, start a simple local server:
   ```
   python3 -m http.server 8934
   ```
3. Open `http://localhost:8934` in your browser — or on your phone, using your computer's local IP address instead of `localhost`, as long as both are on the same WiFi

## Why this project exists

I'm learning JavaScript and wanted a real project to learn on, not another to-do list clone — something I'd actually keep using after I'm done building it. It's also going on my resume, because a small app I built and use every single day is a better story than a project I built once and forgot about.
