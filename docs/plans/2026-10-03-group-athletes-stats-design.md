# Design Document: Other Athletes Activity Stats

## Overview
This feature allows Strava users to view key workout stats (distance, pace, heart rate, moving time) directly for all participants in a group run under the "Other Athletes" modal tab on Strava activity detail pages (`https://www.strava.com/activities/:id`), eliminating the need to manually click into each individual athlete's activity page.

## Requirements & Scope
- Scope: Strava activity pages matching `https://www.strava.com/activities/*`.
- Trigger: An on-demand button ("Tải thông số" / "Load Stats") placed at the top of the "Other Athletes" modal list.
- Metrics Displayed:
  - Distance (km)
  - Average Pace (min/km)
  - Average Heart Rate (bpm, or "— bpm" if not recorded / private)
  - Moving Time (time string)
- Performance & Safety: Rate-limited requests (200ms delay, controlled batching) to respect Strava servers and prevent HTTP 429 errors.
- Session Caching: In-memory cache keyed by activity ID to avoid redundant network requests during the same session.

## Architecture & Implementation Details

### 1. Manifest Configuration (`manifest.json`)
- Add `"https://www.strava.com/activities/*"` to `content_scripts[0].matches`.
- Keep existing permissions minimal (no new permissions required).

### 2. Modal Detection & Button Injection (`content.js`)
- Initialize activity page handler when `window.location.pathname.includes('/activities/')`.
- Use a `MutationObserver` on `document.body` to detect when the Kudos/Comments/Other Athletes modal dialog appears.
- Detect when the "Other Athletes" tab is active.
- Inject a "Tải thông số" button (class: `kudo-all-button group-stats-btn`) in the modal header/tab container once.

### 3. Data Fetching & Parsing Engine
- Scan athlete rows inside the active modal list.
- Extract activity ID from link tags (`a[href*="/activities/"]`).
- For each activity ID:
  - Check in-memory cache (`groupStatsCache.get(activityId)`).
  - If not cached, fetch `/activities/${activityId}` with standard browser credentials.
  - Parse HTML via `DOMParser`:
    - Target Strava activity stats containers (`.inline-stats`, `ul.inline-stats`, or Next.js state/meta fallback).
    - Extract distance, pace, heart rate, and moving time.
    - Cache parsed results.
- Display loading indicators per row and progress counter on the action button (`Đang tải thông số... (x/n)`).

### 4. UI & Styling (`styles.css`)
- Stat chip badge container below athlete activity title:
  - Minimal Strava-native design with clean icons and dark/light mode compatibility.
  - Responsive flex layout with wrap for mobile/smaller screens.
  - Clear styling for private activities or unmeasured heart rates.

### 5. Testing & Verification
- Test activity pages with group athletes (`/activities/[id]`).
- Verify button appearance when switching to "Other Athletes" tab.
- Verify correct parsing of distance, pace, HR, and time across various Strava activity formats.
- Verify rate limiting and error recovery (private activities or network failures).
