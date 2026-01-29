# Spectrum Buddy

A Chrome Extension for viewing your UM Spectrum (Moodle LMS) assignment deadlines at a glance.

<img width="401" height="460" alt="image" src="https://github.com/user-attachments/assets/d07a3d9b-b58d-4cfd-a99e-57afe60adf3f" />


## Features

- 📅 View upcoming assignment deadlines in a clean popup UI
- 🔴 Visual urgency indicators (red < 24h, yellow < 7 days, gray > 7 days, black = overdue)
- 🔄 Automatic background sync every 30 minutes
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
npm run dev

# 3. Load extension in Chrome:
#    - Open chrome://extensions/
#    - Enable "Developer mode" (toggle in top-right)
#    - Click "Load unpacked"
#    - Select the `dist` folder from this project
```

### Production Build

```bash
# Build for production
npm run build

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

## Configuration

### Updating the Parser Selectors

The parser in `src/utils/parser.js` uses placeholder CSS selectors. After inspecting the actual Spectrum website, update the `SELECTORS` object:

```javascript
const SELECTORS = {
  eventItems: ['.your-actual-selector'],
  courseName: ['.your-course-name-selector'],
  // ... etc
};
```

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
