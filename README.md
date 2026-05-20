# Spectrum Buddy

A Chrome Extension for viewing your UM Spectrum (Moodle LMS) assignment deadlines at a glance.

<img width="399" height="450" alt="image" src="https://github.com/user-attachments/assets/847783d5-bfe5-4dbb-afe4-93cc9b84a772" />



## Features

- 📅 View upcoming assignment deadlines in a clean popup UI
- 🎨 Visual urgency indicators:
  - 🔴 **Red:** Due in < 24 hours
  - 🟡 **Yellow:** Due in < 4 days
  - 🟢 **Green:** Due in > 4 days
  - ⚫ **Gray:** Overdue
- 🔄 Automatic background sync every 5 minutes
- 🔔 Desktop reminders (48h, 24h and 1h before due by default)
- 🔎 Search and filter by course
- ⚙️ Built-in settings for reminders and refresh interval
- 🔒 Uses your existing browser session (no separate login required)
- 📱 Lightweight and fast

## Tech Stack

- React 18 + Vite
- CRXJS Vite Plugin (for HMR & manifest generation)
- Tailwind CSS
- Chrome Extension Manifest V3

## Setup & Installation

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start development server (with HMR)
npm run dev:chrome

# 3. Load extension in Chrome:
#    - Open chrome://extensions/
#    - Enable "Developer mode" (toggle in top-right)
#    - Click "Load unpacked"
#    - Select the `dist` folder from this project
```

### Production Build

```bash
# Build for production
npm run build:all

# The `dist` folder contains the production-ready extension
```

## Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist` folder from this project
5. The extension icon will appear in your toolbar

## Usage

1. **Log in to Spectrum** first at https://spectrum.um.edu.my
2. Click the Spectrum Buddy icon in your toolbar
3. View your upcoming deadlines with urgency indicators
4. Click any assignment to open it in Spectrum

### Badge Indicators

- **Red "!"** - You need to log in to Spectrum
- **Blue number** - Number of urgent deadlines (< 24h)
- **No badge** - Everything is up to date

### Notifications

- Default reminders: **48 hours**, **24 hours** and **1 hour** before due
- Customize reminders and refresh interval in the popup settings
- Clicking a notification opens the assignment in Spectrum

## Configuration

### Adjusting Fetch Interval

In `src/background/index.js`, modify `FETCH_INTERVAL_MINUTES`:

```javascript
const FETCH_INTERVAL_MINUTES = 30; // Change to desired interval
```

## Project Structure

```
spectrum-buddy/
├── manifest.json          # Extension manifest (auto-processed by CRXJS)
├── vite.config.js         # Vite + CRXJS configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── src/
│   ├── background/
│   │   └── index.js       # Service worker (fetch logic)
│   ├── popup/
│   │   ├── App.jsx        # React popup UI
│   │   ├── index.jsx      # React entry point
│   │   ├── index.html     # Popup HTML
│   │   └── index.css      # Tailwind imports
│   └── utils/
│       └── parser.js      # Moodle HTML parser
└── public/
    └── icons/             # Extension icons
```

## Troubleshooting

### "Session Expired" message
- Log in to https://spectrum.um.edu.my in your browser
- Click refresh in the extension popup

### No deadlines showing
- The parser selectors may need updating for your Spectrum version
- Open DevTools on Spectrum and inspect the timeline elements
- Update selectors in `src/utils/parser.js`

### Extension not updating
- Go to `chrome://extensions/`
- Click the refresh icon on the Spectrum Buddy card

## License

MIT License - see [LICENSE](LICENSE) for details.
