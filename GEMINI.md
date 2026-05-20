# Spectrum Buddy - Project Context & Documentation

Spectrum Buddy is a high-performance cross-browser browser extension (supporting both Google Chrome and Mozilla Firefox) designed to help University of Malaya (UM) students track assignment, tutorial, and quiz deadlines directly from the **Spectrum LMS** (Moodle-based system). 

By extracting the user's active session key securely in the background, the extension queries the Moodle calendar events API and presents deadlines in a highly interactive, responsive popup interface featuring visual urgency indicators, real-time filtering, customizable reminder periods, and full-screen looping audio alarms.

---

## 🛠️ Technology Stack

*   **Frontend Core & Logic:** [React 18](https://react.dev/) + [Javascript (ES6+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
*   **Build Engine & HMR:** [Vite](https://vite.dev/) + [@crxjs/vite-plugin (Beta)](https://crxjs.dev/) for seamless hot-module replacement and dynamic manifest generation.
*   **Styling & Design System:** [Tailwind CSS v3](https://tailwindcss.com/) + PostCSS + Autoprefixer for a responsive utility-first UI.
*   **Cross-Browser Compatibility:** [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) wrapper permitting unified `browser.*` API syntax.
*   **Extension Architecture:** Manifest V3 (programmatic manifest assembly with adaptive settings for Chrome vs. Firefox).
*   **Data Communications:** Moodle AJAX API Service (`core_calendar_get_action_events_by_timesort`).

---

## 📂 Project Directory Structure

```text
Spectrum Buddy/
├── manifest.config.js     # Programmatic, browser-aware Manifest V3 generator
├── vite.config.js         # Vite configuration with CRXJS plugin & multi-page entry points
├── tailwind.config.js     # Tailwind CSS theme extension configurations
├── postcss.config.js      # PostCSS processor rules for Autoprefixer/Tailwind CSS
├── package.json           # Project dependencies and environment-specific build scripts
├── public/
│   ├── icons/             # Chrome/Firefox extension branding assets (16px, 48px, 128px)
│   └── audio/
│       └── reminder.mp3   # Alarm sound played during deadline reminder alerts
├── src/
│   ├── background/
│   │   └── index.js       # Core Service Worker / Background Script (polling & notifications)
│   ├── popup/             # Main interactive Extension Popup UI (React App)
│   │   ├── index.html     # Popup mount page
│   │   ├── index.jsx      # React entry point mounting to DOM
│   │   ├── index.css      # Core Tailwind CSS directives
│   │   ├── App.jsx        # Complete Popup UI, filters, custom reminders, and drawer controls
│   │   └── App_new.jsx    # [Legacy/Draft] Alternate simplified popup design mock
│   ├── reminder/          # High-Impact Full-Screen Reminder Window (React App)
│   │   ├── index.html     # Full-screen reminder entry point
│   │   ├── index.jsx      # Mount script for reminder component
│   │   ├── index.css      # Reminder Tailwind styles
│   │   └── App.jsx        # Loop-alarm full-screen React UI for impending deadlines
│   └── utils/
│       ├── browser-polyfill.js  # Firefox/Chrome polyfill wrapper for unified browser API
│       ├── spectrumConfig.js    # Decoupled selectors, URLs, patterns, and API string keys
│       └── parser.js            # [Legacy Fallback] Moodle HTML Scraper & Date Converter
```

---

## 🚀 Key Build & Development Commands

All scripts are executed from the project root and utilize `cross-env` to dynamically adjust the output bundler parameters for the desired target browser:

*   **Install Dependencies:**
    ```bash
    npm install
    ```
*   **Chrome Hot-Reloading Development Loop:**
    ```bash
    npm run dev:chrome
    ```
    *Builds continuously to `dist/chrome/`. Load this directory as an "unpacked extension" in `chrome://extensions/`.*
*   **Firefox Hot-Reloading Development Loop:**
    ```bash
    npm run dev:firefox
    ```
    *Builds continuously to `dist/firefox/`.*
*   **Production Build (Chrome only):**
    ```bash
    npm run build:chrome
    ```
    *Creates optimized minified bundles under `dist/chrome/`.*
*   **Production Build (Firefox only):**
    ```bash
    npm run build:firefox
    ```
    *Creates optimized minified bundles under `dist/firefox/`.*
*   **Double-Target Production Build:**
    ```bash
    npm run build:all
    ```
    *Builds production bundles sequentially for both Chrome and Firefox.*

---

## ⚡ Core Architecture & Advanced Features

### 1. Robust API Authentication & Session Fetching
Rather than prompting users to input and store their raw credentials, Spectrum Buddy leverages the browser's active cookies on the `https://spectrum.um.edu.my` domain for a seamless authentication experience:
*   The background worker periodically issues a credential-inclusive (`credentials: 'include'`) HTTP fetch request to the Spectrum User Dashboard (`/my/`).
*   If the user session is active, the worker parses the HTML via optimized regular expressions defined in `spectrumConfig.patterns` to extract the active **`sesskey`** (Session Key).
*   If the session is expired or invalid (e.g. redirected to login), the extension shifts its global status to `NEEDS_LOGIN` and triggers a red `!` action badge on the extension icon.

### 2. High-Frequency Background Synchronizations
*   A periodic sync runs in the background using the browser `alarms` API, configured to fire every **5 minutes** (`FETCH_INTERVAL_MINUTES = 5`).
*   Deadlines are requested from Moodle's core AJAX endpoint (`/lib/ajax/service.php`) by submitting a JSON query invoking the Moodle calendar action `core_calendar_get_action_events_by_timesort`.
*   To ensure overdue assignments are not omitted, the sync sets `timesortfrom` to **30 days in the past**.
*   The badge updates reactively:
    *   🔴 **Red exclamation mark (`!`):** Authentication is required (User needs to log in).
    *   🟡 **Yellow question mark (`?`):** Connection or API fetch error.
    *   🔵 **Blue count badge:** Represents the count of urgent deadlines due within **24 hours**.
    *   ⚪ **No badge:** All caught up with no impending urgent deadlines.

### 3. High-Impact Interactive Audio Alarms
impending deadlines trigger rich alerts:
1.  **Desktop Notification:** Standard browser notifications displaying the assignment title, course, and formatted due date.
2.  **Full-Screen Reminders (`src/reminder/`):** Opens a dedicated full-screen tab displaying the deadline details in a clean, minimalist user interface.
3.  **Auditory Feedback:** The full-screen reminder tab automatically plays `/audio/reminder.mp3` in a loop to guarantee user attention. An interactive **MUTE/UNMUTE** button is provided to control or stop the loop, along with high-contrast buttons to go directly to Spectrum or dismiss the alert.
4.  **Configurable Intervals:** Reminders trigger by default at **48 hours**, **24 hours**, and **1 hour** before the deadline. Users can toggle these defaults or add up to **3 custom offsets** (hours or days before) dynamically via the settings pane in the popup.

### 4. Smart Visual Urgency Classifications
Impending deadlines are evaluated dynamically using local system times and displayed with custom Tailwind styling cards:
*   🔴 **Red Card (`border-l-red-500 bg-red-50`):** Due in less than 24 hours.
*   🟡 **Yellow Card (`border-l-yellow-500 bg-yellow-50`):** Due in less than 4 days.
*   🟢 **Green Card (`border-l-green-500 bg-green-50`):** Due in more than 4 days.
*   ⚫ **Gray Card (`border-l-gray-500 bg-gray-100`):** Past deadline (Overdue).

### 5. Interactive Popup Control Panel
*   **Real-time Search:** Users can instantaneously search through course names and assignment titles via a dedicated query bar.
*   **Hide/Unhide Logic:** Hovering over any deadline card reveals an eye icon button allowing users to hide specific assignments. A top-bar indicator shows the count of hidden items and toggles their visibility.
*   **Dynamic Course Filter (Engine Ready):** The filtering engine has full state logic for filtering by course (`selectedCourse` state), though the dropdown control is currently omitted from the UI layer.
*   **Feedback & Support Hub:** Accessible via the bottom drawer, offering users instant connections to Bug Reports, Feature Requests, Chrome Web Store reviews, and direct developer contact credentials (email and WhatsApp).

---

## 📝 Development & Maintenance Guidelines

*   **Selectors & Configuration Decorators:** All endpoints, regex patterns, CSS selectors, and API methods are consolidated in [spectrumConfig.js](file:///D:/Documents/Personal%20Projects/Spectrum%20Buddy/src/utils/spectrumConfig.js). Never hardcode selectors directly into active background routines or scraping functions.
*   **Legacy HTML Scraper (`src/utils/parser.js`):** Contains fallback parser logic utilizing DOMParser to crawl upcoming timeline elements and scrape metadata. Although active fetch loops run exclusively over Moodle's AJAX API, this script remains intact as a fallback should Moodle change its REST/AJAX structures.
*   **Chrome/Firefox Manifest Parity:** Always configure manifest settings within [manifest.config.js](file:///D:/Documents/Personal%20Projects/Spectrum%20Buddy/manifest.config.js) instead of writing raw `manifest.json` files. The CRXJS compiler uses this configuration script to construct the optimal manifest dynamically during build time.
