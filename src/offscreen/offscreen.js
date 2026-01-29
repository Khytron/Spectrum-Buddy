import { parseMoodleDeadlines } from '../utils/parser.js';

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PARSE_HTML') {
    handleParseRequest(message.html, sendResponse);
    return true; // Keep the message channel open for async response
  }
});

function handleParseRequest(html, sendResponse) {
  try {
    const deadlines = parseMoodleDeadlines(html);
    sendResponse({ success: true, deadlines });
  } catch (error) {
    console.error('[Offscreen] Parse error:', error);
    sendResponse({ success: false, error: error.message });
  }
}
