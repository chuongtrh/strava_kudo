# Strava Kudo All

Chrome extension to automatically kudo all activities on the Strava dashboard.

## Features

- ✅ Adds a "Kudo All" button to the Strava header
- ✅ **Ignore List**: Ability to skip specific athletes from being kudoed
- ✅ **Quick Ignore**: Add athletes to the ignore list directly from their activity cards
- ✅ **Management UI**: Dedicated interface to view and manage your ignored athletes
- ✅ Only kudos activities that haven't been kudoed yet
- ✅ Displays a notification with the number of activities kudoed
- ✅ No auto-scroll - only kudos what is currently visible

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right corner)
4. Click "Load unpacked"
5. Select the `strava_kudo` directory

## Usage

1. Go to https://www.strava.com/dashboard
2. Click the **Kudo All** button in the header to kudo all visible unkudoed activities.
3. Click the **Ignore** button on any activity to add that athlete to your Ignore List.
4. Click the **Ignore List** button in the header (next to Kudo All) to view and manage your ignored athletes.
5. A notification will show the status and count of activities processed.

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
- Athletes in the **Ignore List** are automatically skipped during "Kudo All"
- Data for the ignore list is stored in your browser's local storage
- Includes a small delay between kudos to avoid rate limiting
