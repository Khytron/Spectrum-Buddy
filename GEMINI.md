# Spectrum Buddy - Project Context

## Overview
Spectrum Buddy is a Chrome Extension designed to help students track assignment deadlines from the Spectrum LMS (University of Malaya's Moodle-based system). It fetches deadlines and displays them in a popup with urgency indicators.

## Tech Stack
- **Framework:** React 18
- **Build Tool:** Vite + @crxjs/vite-plugin
- **Styling:** Tailwind CSS
- **Extension Manifest:** V3

## Project Structure
- **`src/popup/`**: The frontend UI of the extension (React App).
    - `App.jsx`: Main component rendering the deadline list.
- **`src/background/`**: Background service worker.
    - `index.js`: Handles periodic fetching (alarms) and badge updates.
- **`src/utils/`**: Shared utilities.
    - `parser.js`: HTML parsing logic to extract deadlines from Spectrum's pages. **Crucial:** Selectors here may need updates if the website layout changes.
- **`manifest.json`**: Extension configuration (permissions, host permissions, background scripts).

## Key Commands
- **Install Dependencies:** `npm install`
- **Development (HMR):** `npm run dev`
- **Build for Production:** `npm run build` (Output: `dist/`)

## Key Features
- **Authentication:** Relies on the user's active browser session cookies for `https://spectrum.um.edu.my`.
- **Background Sync:** Fetches data periodically (default: 30 mins) to update the badge icon.
- **Urgency Indicators:**
    - 🔴 Red: < 24 hours
    - 🟡 Yellow: < 4 days
    - 🟢 Green: > 4 days
    - ⚫ Gray: Overdue

## Development Notes
- **Testing:** Load the `dist` folder as an "unpacked extension" in `chrome://extensions`.
- **Parser:** The `src/utils/parser.js` file contains CSS selectors that are critical for scraping data. These are currently placeholders and need to be verified against the actual Spectrum website.
