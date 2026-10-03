# Group Athletes Stats Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow Strava users to view distance, pace, heart rate, and moving time for all participants in a group run directly inside the "Other Athletes" modal on Strava activity pages (`/activities/:id`).

**Architecture:** Inject an on-demand "Tải thông số" (Load Stats) button into Strava's "Other Athletes" modal tab. On click, the extension extracts activity links from each row, fetches activity details with session credentials in a rate-limited queue (200ms delay), parses key metrics via `DOMParser`, caches results in memory, and renders clean stat badges below each athlete.

**Tech Stack:** Vanilla JavaScript (ES6+), Chrome Extension Manifest V3, CSS.

---

### Task 1: Update Manifest URL Matches

**Files:**
- Modify: `manifest.json:10-17`

**Step 1: Update manifest.json**
Add `"https://www.strava.com/activities/*"` to the `content_scripts[0].matches` array.

```json
  "content_scripts": [
    {
      "matches": [
        "https://www.strava.com/dashboard*",
        "https://www.strava.com/athletes/*",
        "https://www.strava.com/activities/*"
      ],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
```

**Step 2: Validate manifest JSON syntax**
Run: `python3 -m json.tool manifest.json >/dev/null`
Expected: Exits with code 0 (valid JSON).

**Step 3: Commit**
```bash
git add manifest.json
git commit -m "feat(manifest): add activity pages to content script matches"
```

---

### Task 2: Add CSS Styles for Stats Button and Badges

**Files:**
- Modify: `styles.css`

**Step 1: Add CSS rules**
Add styles for:
- `.group-stats-btn`: Styled button matching Strava's orange / clean secondary button style.
- `.athlete-stats-container`: Flex container for displaying stats underneath the athlete name.
- `.athlete-stat-badge`: Individual chip/pill for km, pace, hr, time.
- `.athlete-stat-loading`: Muted shimmer/loading state indicator.
- `.athlete-stat-private`: Subtle badge for private activities.

**Step 2: Check whitespace and CSS syntax**
Run: `git diff --check`
Expected: Clean with no whitespace errors.

**Step 3: Commit**
```bash
git add styles.css
git commit -m "feat(styles): add css styles for group athlete stats and action button"
```

---

### Task 3: Implement Activity HTML Stats Parser & Parsing Test

**Files:**
- Modify: `content.js`
- Create test script: `test-parser.js`

**Step 1: Write parser function in content.js**
Implement `parseActivityStats(htmlString)`:
- Parse HTML with `DOMParser`.
- Extract:
  - Distance (e.g. from `.inline-stats`, `[data-testid="distance"]`, or title/meta fallbacks).
  - Pace (e.g. from `.inline-stats`, pace labels, or calculated from distance & moving time).
  - Heart Rate (e.g. from `.inline-stats`, `stat-subhead` matching "Heart Rate" or containing "bpm"; return `null` if absent).
  - Moving Time (e.g. from `.inline-stats`, `stat-subhead` matching "Time").

**Step 2: Write test verification script**
Test `parseActivityStats` with sample Strava HTML structures (standard run, run without HR, private run).
Run: `node test-parser.js`
Expected: Output showing correctly extracted fields for all test cases.

**Step 3: Remove test script & commit**
```bash
git add content.js
git commit -m "feat: implement activity stats parser"
```

---

### Task 4: Implement Modal Detection, Injection, and Rate-Limited Fetch Queue

**Files:**
- Modify: `content.js`

**Step 1: Update init() and route handling**
- Check `window.location.pathname.includes('/activities/')`.
- Setup `setupActivityPageObserver()` to watch for dialog / modal injection.
- When dialog with "Other Athletes" tab appears:
  - Inject the "Tải thông số" button if not already present.

**Step 2: Implement button click handler & fetching queue**
- Scan all athlete rows inside the "Other Athletes" tab list.
- Extract `activityId` from `<a href="/activities/...">`.
- For each item:
  - If in `groupStatsCache`, render immediately.
  - Otherwise, queue fetch `/activities/${activityId}` with 200ms delay between items.
  - Update button text with progress: `Đang tải thông số... (${current}/${total})`.
  - Render stat badges into the row.

**Step 3: Validate code syntax and whitespace**
Run: `node -c content.js && git diff --check`
Expected: Syntax clean, no errors.

**Step 4: Commit**
```bash
git add content.js
git commit -m "feat: implement modal detection and rate-limited stats fetching"
```

---

### Task 5: Documentation Update & Verification

**Files:**
- Modify: `README.md`

**Step 1: Update README.md**
Document the new feature:
- Explain the "Other Athletes" stats button on activity pages.
- List supported metrics (Distance, Pace, Heart Rate, Moving Time).
- Add manual testing instructions for activity pages.

**Step 2: Commit**
```bash
git add README.md
git commit -m "docs: update README with other athletes stats feature guide"
```
