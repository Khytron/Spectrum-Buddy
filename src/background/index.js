const SPECTRUM_URL = 'https://spectrum.um.edu.my/my/';
const API_URL = 'https://spectrum.um.edu.my/lib/ajax/service.php';
const ALARM_NAME = 'fetchDeadlinesAlarm';
const FETCH_INTERVAL_MINUTES = 30;
const MIN_REFRESH_MINUTES = 5;
const MAX_REFRESH_MINUTES = 180;

const DEFAULT_PREFERENCES = {
  notificationsEnabled: true,
  reminderOffsets: [1440, 60], // 24 hours, 1 hour
  refreshMinutes: FETCH_INTERVAL_MINUTES,
};

/**
 * Ensures preferences are normalized and persisted
 * @returns {Promise<{notificationsEnabled: boolean, reminderOffsets: number[], refreshMinutes: number}>}
 */
async function ensurePreferences() {
  const { preferences } = await chrome.storage.local.get(['preferences']);
  const normalized = normalizePreferences(preferences || {});

  if (!preferences || JSON.stringify(preferences) !== JSON.stringify(normalized)) {
    await chrome.storage.local.set({ preferences: normalized });
  }

  return normalized;
}

/**
 * Normalizes preference values with defaults and bounds
 * @param {object} prefs
 */
function normalizePreferences(prefs) {
  const refreshMinutes = clampNumber(
    typeof prefs.refreshMinutes === 'number' ? prefs.refreshMinutes : DEFAULT_PREFERENCES.refreshMinutes,
    MIN_REFRESH_MINUTES,
    MAX_REFRESH_MINUTES
  );

  const reminderOffsets = Array.isArray(prefs.reminderOffsets) && prefs.reminderOffsets.length > 0
    ? prefs.reminderOffsets.filter((value) => Number.isFinite(value) && value > 0)
    : DEFAULT_PREFERENCES.reminderOffsets;

  return {
    notificationsEnabled: prefs.notificationsEnabled ?? DEFAULT_PREFERENCES.notificationsEnabled,
    reminderOffsets: Array.from(new Set(reminderOffsets)).sort((a, b) => b - a),
    refreshMinutes,
  };
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function scheduleAlarm(refreshMinutes) {
  await chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: refreshMinutes,
  });
}

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

function formatOffsetLabel(offsetMinutes) {
  if (offsetMinutes >= 60) {
    const hours = Math.round(offsetMinutes / 60);
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${offsetMinutes} minutes`;
}

async function processReminders(deadlines) {
  const preferences = await ensurePreferences();
  if (!preferences.notificationsEnabled) {
    return;
  }

  const now = Date.now();
  const { sentReminders = {}, notificationLinks = {}, hiddenAssignments = [] } =
    await chrome.storage.local.get(['sentReminders', 'notificationLinks', 'hiddenAssignments']);
  const hiddenSet = new Set(hiddenAssignments || []);
  const deadlineMap = new Map(deadlines.map((deadline) => [deadline.id, deadline]));

  const updatedSent = { ...sentReminders };
  const updatedLinks = { ...notificationLinks };

  for (const deadline of deadlines) {
    if (deadline.isSubmitted || hiddenSet.has(deadline.id)) {
      continue;
    }

    const dueTime = new Date(deadline.dueDate).getTime();
    if (!Number.isFinite(dueTime) || dueTime <= now) {
      continue;
    }

    for (const offsetMinutes of preferences.reminderOffsets) {
      const offsetMs = offsetMinutes * 60 * 1000;
      if (dueTime - now > offsetMs) {
        continue;
      }

      const reminderKey = `${deadline.id}:${offsetMinutes}`;
      if (updatedSent[reminderKey]) {
        continue;
      }

      const notificationId = `deadline:${deadline.id}:${offsetMinutes}`;
      const dueDate = new Date(deadline.dueDate);
      const offsetLabel = formatOffsetLabel(offsetMinutes);
      const title = `Due in ${offsetLabel}`;
      const message = `${deadline.assignmentTitle} (${deadline.courseName || 'Unknown Course'})\nDue ${dueDate.toLocaleString()}`;

      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title,
        message,
        priority: 1,
      });

      updatedSent[reminderKey] = now;
      updatedLinks[notificationId] = deadline.link || SPECTRUM_URL;
    }
  }

  // Cleanup reminders for missing/old deadlines or offsets
  const validOffsets = new Set(preferences.reminderOffsets.map((offset) => offset.toString()));
  for (const key of Object.keys(updatedSent)) {
    const [deadlineId, offset] = key.split(':');
    const deadline = deadlineMap.get(deadlineId);
    if (!deadline || !validOffsets.has(offset)) {
      delete updatedSent[key];
      continue;
    }
    const dueTime = new Date(deadline.dueDate).getTime();
    if (!Number.isFinite(dueTime) || dueTime < now - (7 * 24 * 60 * 60 * 1000)) {
      delete updatedSent[key];
    }
  }

  await chrome.storage.local.set({
    sentReminders: updatedSent,
    notificationLinks: updatedLinks,
  });
}

/**
 * Main function to fetch and process deadlines
 */
export async function fetchDeadlines() {
  console.log('[Spectrum Buddy] Fetching deadlines via API...');

  await ensurePreferences();

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
    await processReminders(deadlines);

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
  ensurePreferences().then((preferences) => {
    scheduleAlarm(preferences.refreshMinutes);
    fetchDeadlines();
  });
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Spectrum Buddy] Browser started');
  ensurePreferences().then((preferences) => {
    scheduleAlarm(preferences.refreshMinutes);
    fetchDeadlines();
  });
});

// Listen for manual refresh requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'refreshDeadlines') {
    fetchDeadlines().then(() => sendResponse({ success: true }));
    return true; // Keep message channel open for async response
  }

  if (message.action === 'updatePreferences') {
    const normalized = normalizePreferences(message.preferences || {});
    chrome.storage.local.set({ preferences: normalized }).then(() => {
      scheduleAlarm(normalized.refreshMinutes).then(() => sendResponse({ success: true }));
    });
    return true;
  }
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
  const { notificationLinks = {} } = await chrome.storage.local.get(['notificationLinks']);
  const link = notificationLinks[notificationId];
  if (link) {
    await chrome.tabs.create({ url: link });
    delete notificationLinks[notificationId];
    await chrome.storage.local.set({ notificationLinks });
  }
  chrome.notifications.clear(notificationId);
});
