# Spectrum Buddy - Project Context

## Overview
Spectrum Buddy is a Chrome Extension designed to help students track assignment deadlines from the Spectrum LMS (University of Malaya's Moodle-based system). It fetches deadlines using Moodle's AJAX API and displays them in a popup with urgency indicators and notifications.

## Tech Stack
- **Framework:** React 18
- **Build Tool:** Vite + @crxjs/vite-plugin
- **Styling:** Tailwind CSS
- **Extension Manifest:** V3
- **Primary Data Source:** Moodle AJAX API (`core_calendar_get_action_events_by_timesort`)

## Project Structure
- **`src/popup/`**: The frontend UI of the extension (React App).
    - `App.jsx`: Main component rendering the deadline list, search, filters, and settings.
    - `App_new.jsx`: (Draft/Legacy) Simplified version of the popup.
- **`src/background/`**: Background service worker.
    - `index.js`: Handles periodic fetching (alarms), session key extraction, API calls, badge updates, and notifications.
- **`src/offscreen/`**: Offscreen document scripts.
    - `offscreen.js`: Provides access to `DOMParser` for HTML scraping (currently used as a legacy/fallback method).
- **`src/utils/`**: Shared utilities.
    - `parser.js`: HTML parsing logic for Spectrum's pages (Legacy fallback).
- **`manifest.json`**: Extension configuration (permissions, host permissions, background scripts).

## Key Commands
- **Install Dependencies:** `npm install`
- **Development (HMR):** `npm run dev`
- **Build for Production:** `npm run build` (Output: `dist/`)

## Key Features
- **Authentication:** Relies on the user's active browser session cookies for `https://spectrum.um.edu.my`. Extracts `sesskey` automatically from the dashboard.
- **Background Sync:** Fetches data periodically (default: 30 mins, customizable 5–180 mins) to update the badge icon.
- **Notifications:** Desktop alerts for upcoming deadlines with customizable reminder offsets (e.g., 24h, 1h before).
- **Urgency Indicators:**
    - 🔴 Red: Due within 24 hours
    - 🟡 Yellow: Due within 4 days
    - 🟢 Green: Due in more than 4 days
    - ⚫ Gray: Overdue (past deadline)
- **UI Controls:** Search functionality, course filtering, and the ability to hide/ignore specific assignments.

## Development Notes
- **Testing:** Load the `dist` folder as an "unpacked extension" in `chrome://extensions`.
- **Primary Fetch Method:** The extension currently uses the Moodle AJAX API, which is more reliable than HTML scraping.
- **Legacy Parser:** `src/utils/parser.js` and `src/offscreen/` contain HTML parsing logic that is currently inactive in the primary background script but remains in the codebase as a potential fallback.
