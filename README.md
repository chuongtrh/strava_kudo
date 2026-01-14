# Strava Kudo All

Chrome extension to automatically kudo all activities on the Strava dashboard.

## Features

- ✅ Adds a "Kudo All" button to the Strava header
- ✅ Automatically kudos all activities visible on the current page
- ✅ Only kudos activities that haven't been kudoed yet (skips already kudoed ones)
- ✅ Displays a notification with the number of activities kudoed
- ✅ No auto-scroll or loading - only kudos what is currently visible

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right corner)
4. Click "Load unpacked"
5. Select the `strava_kudo` directory

## Usage

1. Go to https://www.strava.com/dashboard
2. Click the "Kudo All" button in the header
3. The extension will automatically kudo all unkudoed activities
4. A notification will show the count of activities kudoed

## Structure

```
strava_kudo/
├── manifest.json       # Extension configuration
├── content.js          # Main logic
├── styles.css          # Styles
├── icon16.png          # Icon 16x16
├── icon48.png          # Icon 48x48
└── icon128.png         # Icon 128x128
```

## Notes

- The extension only works on the Strava dashboard page
- Only kudos activities visible on the current page (does not auto-scroll)
- Includes a small delay between kudos to avoid rate limiting
