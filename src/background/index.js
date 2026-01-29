const SPECTRUM_URL = 'https://spectrum.um.edu.my/my/';
const API_URL = 'https://spectrum.um.edu.my/lib/ajax/service.php';
const ALARM_NAME = 'fetchDeadlinesAlarm';
const FETCH_INTERVAL_MINUTES = 30;

/**
 * Fetches the Spectrum dashboard to get the sesskey
 * @returns {Promise<{loggedIn: boolean, sesskey?: string, error?: string}>}
 */
async function fetchSessionInfo() {
  try {
    const response = await fetch(SPECTRUM_URL, {
      credentials: 'include',
      redirect: 'follow',
    });

    const html = await response.text();

    // Check login
    const isLoginPage =
      response.url.includes('/login') ||
      html.includes('Log in') ||
      html.includes('You are not logged in') ||
      html.includes('loginform');

    if (isLoginPage) {
      return { loggedIn: false };
    }

    // Extract sesskey
    // Pattern: "sesskey":"abc123xyz"  or  sesskey=abc123xyz
    const match = html.match(/"sesskey":"([^"]+)"/) || html.match(/sesskey=([\w\d]+)/);
    if (match && match[1]) {
      return { loggedIn: true, sesskey: match[1] };
    }

    return { loggedIn: true, error: 'Could not find sesskey' };
  } catch (error) {
    console.error('[Spectrum Buddy] Session fetch error:', error);
    return { loggedIn: false, error: error.message };
  }
}

/**
 * Fetches events from Moodle API
 * @param {string} sesskey
 * @returns {Promise<Array>}
 */
async function fetchCalendarEvents(sesskey) {
  const query = [{
    index: 0,
    methodname: 'core_calendar_get_action_events_by_timesort',
    args: {
      limitnum: 20,
      timesortfrom: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // Include last 30 days for overdue items
      limittononsuspendedevents: true
    }
  }];

  const url = `${API_URL}?sesskey=${sesskey}&info=core_calendar_get_action_events_by_timesort`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  });

  const json = await response.json();
  
  if (json[0]?.error) {
    throw new Error(json[0].exception?.message || 'API Error');
  }

  return json[0]?.data?.events || [];
}

/**
 * Transforms API events to our internal deadline format
 * @param {Array} apiEvents
 * @returns {Array}
 */
function processEvents(apiEvents) {
  return apiEvents.map(event => ({
    id: `event-${event.id}`,
    courseName: event.course?.fullname || 'Unknown Course',
    assignmentTitle: event.name || 'Untitled Assignment',
    dueDate: new Date(event.timesort * 1000).toISOString(),
    link: event.action?.url || event.viewurl || '#',
    isSubmitted: event.action?.actionable === false, // Heuristic: if not actionable, maybe submitted?
    isOverdue: new Date(event.timesort * 1000).getTime() < Date.now()
  })).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

/**
 * Updates the extension badge based on status
 * @param {'NEEDS_LOGIN' | 'OK' | 'ERROR'} status
 * @param {number} [count] - Number of upcoming deadlines
 */
async function updateBadge(status, count = 0) {
  if (status === 'NEEDS_LOGIN') {
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#EF4444' }); // Red
  } else if (status === 'ERROR') {
    await chrome.action.setBadgeText({ text: '?' });
    await chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' }); // Yellow
  } else {
    // OK status - show count of urgent items or clear badge
    if (count > 0) {
      await chrome.action.setBadgeText({ text: count.toString() });
      await chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' }); // Blue
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  }
}

/**
 * Counts assignments due within 24 hours
 * @param {Array} deadlines
 * @returns {number}
 */
function countUrgentDeadlines(deadlines) {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  return deadlines.filter((d) => {
    const dueTime = new Date(d.dueDate).getTime();
    return dueTime > now && dueTime - now < oneDayMs && !d.isSubmitted;
  }).length;
}

/**
 * Main function to fetch and process deadlines
 */
export async function fetchDeadlines() {
  console.log('[Spectrum Buddy] Fetching deadlines via API...');

  // Step 1: Get Session Key
  const session = await fetchSessionInfo();

  if (session.error) {
    console.error('[Spectrum Buddy] Session Error:', session.error);
    await chrome.storage.local.set({ status: 'ERROR', error: session.error, lastFetch: Date.now() });
    await updateBadge('ERROR');
    return;
  }

  if (!session.loggedIn) {
    console.log('[Spectrum Buddy] Needs Login');
    await chrome.storage.local.set({ status: 'NEEDS_LOGIN', deadlines: [], lastFetch: Date.now() });
    await updateBadge('NEEDS_LOGIN');
    return;
  }

  // Step 2: Fetch Events via API
  try {
    const rawEvents = await fetchCalendarEvents(session.sesskey);
    const deadlines = processEvents(rawEvents);
    const urgentCount = countUrgentDeadlines(deadlines);

    await chrome.storage.local.set({
      status: 'OK',
      deadlines,
      lastFetch: Date.now(),
    });

    await updateBadge('OK', urgentCount);
    console.log(`[Spectrum Buddy] Found ${deadlines.length} deadlines via API`);

  } catch (error) {
    console.error('[Spectrum Buddy] API Fetch failed:', error);
    await chrome.storage.local.set({
      status: 'ERROR',
      error: 'Failed to fetch Moodle events',
      lastFetch: Date.now(),
    });
    await updateBadge('ERROR');
  }
}
// Listen for alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    fetchDeadlines();
  }
});

// Set up alarm on install/startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Spectrum Buddy] Extension installed');
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: FETCH_INTERVAL_MINUTES,
  });
  fetchDeadlines();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Spectrum Buddy] Browser started');
  fetchDeadlines();
});

// Listen for manual refresh requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'refreshDeadlines') {
    fetchDeadlines().then(() => sendResponse({ success: true }));
    return true; // Keep message channel open for async response
  }
});
