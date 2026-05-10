import browser from '../utils/browser-polyfill';
import { spectrumConfig } from '../utils/spectrumConfig';

const SPECTRUM_URL = spectrumConfig.urls.dashboard;
const API_URL = spectrumConfig.urls.api;
const ALARM_NAME = 'fetchDeadlinesAlarm';
const FETCH_INTERVAL_MINUTES = 5;

const DEFAULT_PREFERENCES = {
  notificationsEnabled: true,
  reminderOffsets: [2880, 1440, 60], // 48 hours, 24 hours, 1 hour
  customOffsets: [],
  refreshMinutes: FETCH_INTERVAL_MINUTES,
};

/**
 * Ensures preferences are normalized and persisted
 * @returns {Promise<{notificationsEnabled: boolean, reminderOffsets: number[], customOffsets: number[], refreshMinutes: number}>}
 */
async function ensurePreferences() {
  const { preferences } = await browser.storage.local.get(['preferences']);
  const normalized = normalizePreferences(preferences || {});

  if (!preferences || JSON.stringify(preferences) !== JSON.stringify(normalized)) {
    await browser.storage.local.set({ preferences: normalized });
  }

  return normalized;
}

/**
 * Normalizes preference values with defaults and bounds
 * @param {object} prefs
 */
function normalizePreferences(prefs) {
  const reminderOffsets = Array.isArray(prefs.reminderOffsets)
    ? prefs.reminderOffsets.filter((value) => Number.isFinite(value) && value > 0)
    : DEFAULT_PREFERENCES.reminderOffsets;

  const FIXED_OFFSETS = [2880, 1440, 60];
  
  let customOffsets = [];
  if (Array.isArray(prefs.customOffsets)) {
    customOffsets = prefs.customOffsets.map(item => {
      if (typeof item === 'number') return { offset: item, mode: 'hours' };
      if (item && typeof item === 'object' && typeof item.offset === 'number') {
        return { offset: item.offset, mode: item.mode || 'hours' };
      }
      return null;
    }).filter(Boolean);
  } else {
    // Migration for older versions storing raw numbers in reminderOffsets
    customOffsets = reminderOffsets
      .filter(v => !FIXED_OFFSETS.includes(v))
      .map(v => ({ offset: v, mode: 'hours' }));
  }

  // Deduplicate custom offsets by their numerical value
  const seen = new Set();
  const uniqueCustom = [];
  for (const item of customOffsets) {
    if (!seen.has(item.offset)) {
      seen.add(item.offset);
      uniqueCustom.push(item);
    }
  }

  return {
    notificationsEnabled: prefs.notificationsEnabled ?? DEFAULT_PREFERENCES.notificationsEnabled,
    reminderOffsets: Array.from(new Set(reminderOffsets)).sort((a, b) => b - a),
    customOffsets: uniqueCustom.sort((a, b) => b.offset - a.offset),
    refreshMinutes: FETCH_INTERVAL_MINUTES,
  };
}

async function scheduleAlarm(refreshMinutes) {
  await browser.alarms.create(ALARM_NAME, {
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
    const match = html.match(spectrumConfig.patterns.sesskeyJson) || html.match(spectrumConfig.patterns.sesskeyUrl);
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
    methodname: spectrumConfig.api.methods.getEvents,
    args: {
      limitnum: 50,
      timesortfrom: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // Include last 30 days for overdue items
      limittononsuspendedevents: true
    }
  }];

  const url = `${API_URL}?sesskey=${sesskey}&info=${spectrumConfig.api.methods.getEvents}`;
  
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
    await browser.action.setBadgeText({ text: '!' });
    await browser.action.setBadgeBackgroundColor({ color: '#EF4444' }); // Red
  } else if (status === 'ERROR') {
    await browser.action.setBadgeText({ text: '?' });
    await browser.action.setBadgeBackgroundColor({ color: '#F59E0B' }); // Yellow
  } else {
    // OK status - show count of urgent items or clear badge
    if (count > 0) {
      await browser.action.setBadgeText({ text: count.toString() });
      await browser.action.setBadgeBackgroundColor({ color: '#3B82F6' }); // Blue
    } else {
      await browser.action.setBadgeText({ text: '' });
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
    return dueTime > now && dueTime - now < oneDayMs;
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
    await browser.storage.local.get(['sentReminders', 'notificationLinks', 'hiddenAssignments']);
  const hiddenSet = new Set(hiddenAssignments || []);
  const deadlineMap = new Map(deadlines.map((deadline) => [deadline.id, deadline]));

  const updatedSent = { ...sentReminders };
  const updatedLinks = { ...notificationLinks };

  for (const deadline of deadlines) {
    if (hiddenSet.has(deadline.id)) {
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

      await browser.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: browser.runtime.getURL('icons/icon128.png'),
        title,
        message,
        priority: 1,
      });

      // Open full-screen reminder tab for all enabled offsets (48h, 24h, 1h)
      const reminderUrl = browser.runtime.getURL(`src/reminder/index.html?title=${encodeURIComponent(deadline.assignmentTitle)}&course=${encodeURIComponent(deadline.courseName)}&dueDate=${encodeURIComponent(deadline.dueDate)}&link=${encodeURIComponent(deadline.link)}&offset=${offsetMinutes}`);
      browser.tabs.create({ url: reminderUrl });

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

  await browser.storage.local.set({
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
    await browser.storage.local.set({ status: 'ERROR', error: session.error, lastFetch: Date.now() });
    await updateBadge('ERROR');
    return;
  }

  if (!session.loggedIn) {
    console.log('[Spectrum Buddy] Needs Login');
    await browser.storage.local.set({ status: 'NEEDS_LOGIN', deadlines: [], lastFetch: Date.now() });
    await updateBadge('NEEDS_LOGIN');
    return;
  }

  // Step 2: Fetch Events via API
  try {
    const rawEvents = await fetchCalendarEvents(session.sesskey);
    const deadlines = processEvents(rawEvents);
    const urgentCount = countUrgentDeadlines(deadlines);

    await browser.storage.local.set({
      status: 'OK',
      deadlines,
      lastFetch: Date.now(),
    });

    await updateBadge('OK', urgentCount);
    console.log(`[Spectrum Buddy] Found ${deadlines.length} deadlines via API`);
    await processReminders(deadlines);

  } catch (error) {
    console.error('[Spectrum Buddy] API Fetch failed:', error);
    await browser.storage.local.set({
      status: 'ERROR',
      error: 'Failed to fetch Moodle events',
      lastFetch: Date.now(),
    });
    await updateBadge('ERROR');
  }
}
// Listen for alarm triggers
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    fetchDeadlines();
  }
});

// Set up alarm on install/startup
browser.runtime.onInstalled.addListener(() => {
  console.log('[Spectrum Buddy] Extension installed');
  ensurePreferences().then((preferences) => {
    scheduleAlarm(preferences.refreshMinutes);
    fetchDeadlines();
  });
});

browser.runtime.onStartup.addListener(() => {
  console.log('[Spectrum Buddy] Browser started');
  ensurePreferences().then((preferences) => {
    scheduleAlarm(preferences.refreshMinutes);
    fetchDeadlines();
  });
});

// Listen for manual refresh requests from popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'refreshDeadlines') {
    fetchDeadlines().then(() => sendResponse({ success: true }));
    return true; // Keep message channel open for async response
  }

  if (message.action === 'updatePreferences') {
    const normalized = normalizePreferences(message.preferences || {});
    browser.storage.local.set({ preferences: normalized }).then(() => {
      scheduleAlarm(normalized.refreshMinutes).then(() => sendResponse({ success: true }));
    });
    return true;
  }

  if (message.action === 'triggerTestReminder') {
    console.log('[Test] Triggering test reminder...');
    const dummyDeadline = {
      id: 'test-assignment-48h',
      assignmentTitle: 'Tutorial Week 7 - Bayes Theorem',
      courseName: 'WIX1002 FUNDAMENTALS OF DATA SCIENCE',
      dueDate: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
      link: 'https://spectrum.um.edu.my',
      isSubmitted: false
    };

    // Immediate response
    sendResponse({ success: true, message: 'Test signal received' });

    (async () => {
      try {
        const { sentReminders = {} } = await browser.storage.local.get(['sentReminders']);
        
        // Force clear flags
        delete sentReminders['test-assignment-48h:2880'];
        delete sentReminders['test-assignment-48h:1440'];
        delete sentReminders['test-assignment-48h:60'];
        
        await browser.storage.local.set({ sentReminders });
        console.log('[Test] Processing 48h reminder...');
        await processReminders([dummyDeadline]);
      } catch (err) {
        console.error('[Test] Error in test handler:', err);
      }
    })();
    return true;
  }
});

browser.notifications.onClicked.addListener(async (notificationId) => {
  const { notificationLinks = {} } = await browser.storage.local.get(['notificationLinks']);
  const link = notificationLinks[notificationId];
  if (link) {
    await browser.tabs.create({ url: link });
    delete notificationLinks[notificationId];
    await browser.storage.local.set({ notificationLinks });
  }
  browser.notifications.clear(notificationId);
});
