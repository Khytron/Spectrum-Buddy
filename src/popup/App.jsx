import React, { useState, useEffect, useCallback } from 'react';

// Urgency thresholds in milliseconds
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
const MIN_REFRESH_MINUTES = 5;
const MAX_REFRESH_MINUTES = 180;

const DEFAULT_PREFERENCES = {
  notificationsEnabled: true,
  reminderOffsets: [1440, 60],
  refreshMinutes: 30,
};

const REMINDER_OPTIONS = [
  { label: '24 hours before', value: 1440 },
  { label: '1 hour before', value: 60 },
];

/**
 * Determines the urgency level of a deadline
 * @param {string} dueDate - ISO date string
 * @returns {'red' | 'yellow' | 'green' | 'gray'}
 */
function getUrgencyLevel(dueDate) {
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const diff = due - now;

  if (diff < 0) return 'gray'; // Overdue
  if (diff < ONE_DAY_MS) return 'red';
  if (diff < FOUR_DAYS_MS) return 'yellow';
  return 'green'; // More than 4 days
}

/**
 * Formats a date for display
 * @param {string} isoDate - ISO date string
 * @returns {string}
 */
function formatDueDate(isoDate) {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return `Past due (${date.toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
  }

  if (diffDays === 0) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diffMs / (1000 * 60));
      return `Due in ${minutes}m`;
    }
    return `Due in ${hours}h`;
  }

  if (diffDays === 1) {
    return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (diffDays < 7) {
    return `${date.toLocaleDateString([], { weekday: 'short' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function normalizePreferences(prefs) {
  const refreshMinutes = Number.isFinite(prefs.refreshMinutes)
    ? Math.min(Math.max(prefs.refreshMinutes, MIN_REFRESH_MINUTES), MAX_REFRESH_MINUTES)
    : DEFAULT_PREFERENCES.refreshMinutes;

  const reminderOffsets = Array.isArray(prefs.reminderOffsets) && prefs.reminderOffsets.length > 0
    ? prefs.reminderOffsets.filter((value) => Number.isFinite(value) && value > 0)
    : DEFAULT_PREFERENCES.reminderOffsets;

  return {
    notificationsEnabled: prefs.notificationsEnabled ?? DEFAULT_PREFERENCES.notificationsEnabled,
    reminderOffsets: Array.from(new Set(reminderOffsets)).sort((a, b) => b - a),
    refreshMinutes,
  };
}

const URGENCY_STYLES = {
  red: 'border-l-red-500 bg-red-50',
  yellow: 'border-l-yellow-500 bg-yellow-50',
  green: 'border-l-green-500 bg-green-50',
  gray: 'border-l-gray-500 bg-gray-100', // Overdue
};

const DOT_STYLES = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  gray: 'bg-gray-500',
};

function DeadlineCard({ deadline, onHide, isHidden }) {
  const urgency = getUrgencyLevel(deadline.dueDate);

  return (
    <div
      className={`group relative border-l-4 p-3 rounded-r-lg mb-2 transition-all hover:shadow-md ${URGENCY_STYLES[urgency]} ${isHidden ? 'opacity-50 grayscale' : ''}`}
    >
      <div className="flex items-start gap-2">
        <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${DOT_STYLES[urgency]}`} />
        <div className="flex-1 min-w-0">
          <a
            href={deadline.link || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-900 hover:text-blue-600 block whitespace-normal break-words"
            title={deadline.assignmentTitle}
          >
            {deadline.assignmentTitle} {isHidden && '(Hidden)'}
          </a>
          <p className="text-xs text-gray-600 truncate" title={deadline.courseName}>
            {deadline.courseName || 'Unknown Course'}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">
              {formatDueDate(deadline.dueDate)}
            </span>
            {deadline.isSubmitted && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Submitted
              </span>
            )}
          </div>
        </div>
        
        {/* Hide Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onHide(deadline.id);
          }}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded-full"
          title={isHidden ? "Unhide" : "Hide assignment"}
        >
          {isHidden ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.05 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function NeedsLoginView() {
  const handleLogin = () => {
    chrome.tabs.create({ url: 'https://spectrum.um.edu.my' });
  };

  return (
    <div className="text-center py-8 px-4">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-4V9m0 0V7m0 2h2m-2 0H9" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Session Expired</h2>
      <p className="text-sm text-gray-600 mb-6">
        Please log in to Spectrum to view your deadlines.
      </p>
      <button
        onClick={handleLogin}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
      >
        Open Spectrum
      </button>
    </div>
  );
}

function ErrorView({ error }) {
  return (
    <div className="text-center py-8 px-4">
      <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Connection Error</h2>
      <p className="text-sm text-gray-600">
        {error || 'Unable to connect to Spectrum. Please check your internet connection.'}
      </p>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

function EmptyView() {
  return (
    <div className="text-center py-8 px-4">
      <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">All Caught Up!</h2>
      <p className="text-sm text-gray-600">
        No upcoming deadlines found.
      </p>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Popup Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-red-600 font-bold mb-2">Something went wrong</h2>
          <p className="text-xs text-gray-600 mb-4">{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            Reload Extension
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const [status, setStatus] = useState('LOADING');
  const [deadlines, setDeadlines] = useState([]);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [showHidden, setShowHidden] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');

  const loadData = useCallback(async () => {
    const data = await chrome.storage.local.get([
      'status',
      'deadlines',
      'lastFetch',
      'error',
      'hiddenAssignments',
      'preferences',
    ]);
    setStatus(data.status || 'LOADING');
    setDeadlines(data.deadlines || []);
    setLastFetch(data.lastFetch);
    setError(data.error);
    setHiddenIds(data.hiddenAssignments || []);
    setPreferences(normalizePreferences(data.preferences || {}));
  }, []);

  useEffect(() => {
    loadData();

    // Listen for storage changes
    const handleStorageChange = (changes) => {
      if (changes.status) setStatus(changes.status.newValue);
      if (changes.deadlines) setDeadlines(changes.deadlines.newValue || []);
      if (changes.lastFetch) setLastFetch(changes.lastFetch.newValue);
      if (changes.error) setError(changes.error.newValue);
      if (changes.hiddenAssignments) setHiddenIds(changes.hiddenAssignments.newValue || []);
      if (changes.preferences) setPreferences(normalizePreferences(changes.preferences.newValue || {}));
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await chrome.runtime.sendMessage({ action: 'refreshDeadlines' });
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const updatePreferences = async (updates) => {
    const nextPreferences = normalizePreferences({ ...preferences, ...updates });
    setPreferences(nextPreferences);
    await chrome.storage.local.set({ preferences: nextPreferences });
    try {
      await chrome.runtime.sendMessage({ action: 'updatePreferences', preferences: nextPreferences });
    } catch (err) {
      console.error('Update preferences failed:', err);
    }
  };

  const toggleHide = async (id) => {
    let newHiddenIds;
    if (hiddenIds.includes(id)) {
      newHiddenIds = hiddenIds.filter(hid => hid !== id);
    } else {
      newHiddenIds = [...hiddenIds, id];
    }
    setHiddenIds(newHiddenIds);
    await chrome.storage.local.set({ hiddenAssignments: newHiddenIds });
  };

  // Categorize deadlines
  const upcoming = [];
  const overdue = [];
  const now = Date.now();

  const availableCourses = Array.from(
    new Set(deadlines.map((deadline) => deadline.courseName).filter(Boolean))
  ).sort();

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredDeadlines = deadlines.filter((deadline) => {
    if (!showHidden && hiddenIds.includes(deadline.id)) {
      return false;
    }
    if (selectedCourse !== 'ALL' && deadline.courseName !== selectedCourse) {
      return false;
    }
    if (normalizedSearch) {
      const haystack = `${deadline.assignmentTitle || ''} ${deadline.courseName || ''}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) {
        return false;
      }
    }
    return true;
  });

  filteredDeadlines.forEach((d) => {
    if (d.isSubmitted) return; 
    const dueTime = new Date(d.dueDate).getTime();
    if (dueTime < now) {
      overdue.push(d);
    } else {
      upcoming.push(d);
    }
  });

  const hiddenCount = hiddenIds.length;

  return (
    <div className="w-80 h-[360px] bg-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Spectrum Buddy</h1>
          <div className="flex items-center gap-2">
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowHidden(!showHidden)}
                className={`p-1.5 rounded-full transition-colors text-xs flex items-center gap-1 ${showHidden ? 'bg-white/30' : 'hover:bg-white/20'}`}
                title={showHidden ? "Hide ignored items" : "Show hidden assignments"}
              >
                {showHidden ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>{hiddenCount}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.05 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <span>{hiddenCount}</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-full transition-colors ${showSettings ? 'bg-white/30' : 'hover:bg-white/20'}`}
              title={showSettings ? 'Close settings' : 'Open settings'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.983 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM20.667 12a8.614 8.614 0 00-.088-1.2l2.005-1.56-2-3.464-2.384.96a8.785 8.785 0 00-2.079-1.2l-.36-2.52H10.2l-.36 2.52a8.785 8.785 0 00-2.079 1.2l-2.384-.96-2 3.464 2.005 1.56A8.614 8.614 0 005.333 12c0 .405.03.804.088 1.2l-2.005 1.56 2 3.464 2.384-.96a8.785 8.785 0 002.079 1.2l.36 2.52h4.56l.36-2.52a8.785 8.785 0 002.079-1.2l2.384.96 2-3.464-2.005-1.56c.058-.396.088-.795.088-1.2z"
                />
              </svg>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
              title="Refresh deadlines"
            >
              <svg
                className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-xs text-blue-100 mt-1">Made by a student, for students</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          {status === 'LOADING' && <LoadingView />}
          {status === 'NEEDS_LOGIN' && <NeedsLoginView />}
          {status === 'ERROR' && <ErrorView error={error} />}
          
          {status === 'OK' && (
            <>
            {showSettings && (
              <div className="mb-4 rounded-lg border bg-gray-50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Notifications</p>
                    <p className="text-xs text-gray-500">Get reminders before deadlines.</p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={preferences.notificationsEnabled}
                      onChange={(e) => updatePreferences({ notificationsEnabled: e.target.checked })}
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${preferences.notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                      <span className={`block w-3 h-3 bg-white rounded-full mt-1 ml-1 transition-transform ${preferences.notificationsEnabled ? 'translate-x-5' : ''}`} />
                    </div>
                  </label>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Reminder times</p>
                  <div className="flex flex-col gap-2">
                    {REMINDER_OPTIONS.map((option) => (
                      <label key={option.value} className="text-xs text-gray-700 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={preferences.reminderOffsets.includes(option.value)}
                          disabled={!preferences.notificationsEnabled}
                          onChange={() => {
                            const current = preferences.reminderOffsets;
                            const nextOffsets = current.includes(option.value)
                              ? current.filter((value) => value !== option.value)
                              : [...current, option.value];
                            updatePreferences({ reminderOffsets: nextOffsets });
                          }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">Refresh interval (minutes)</label>
                  <input
                    type="number"
                    min={MIN_REFRESH_MINUTES}
                    max={MAX_REFRESH_MINUTES}
                    value={preferences.refreshMinutes}
                    onChange={(e) => {
                      const nextValue = Number(e.target.value);
                      updatePreferences({ refreshMinutes: Number.isNaN(nextValue) ? MIN_REFRESH_MINUTES : nextValue });
                    }}
                    className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Min {MIN_REFRESH_MINUTES}, max {MAX_REFRESH_MINUTES} minutes.</p>
                </div>
              </div>
            )}

            <div className="mb-3 space-y-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search assignments or courses"
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="ALL">All courses</option>
                {availableCourses.map((course) => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            {upcoming.length === 0 && overdue.length === 0 && <EmptyView />}
            
            {/* Upcoming Section */}
            {(upcoming.length > 0 || overdue.length > 0) && (
              <div className="mb-6">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {upcoming.length} Upcoming Deadline{upcoming.length !== 1 ? 's' : ''}
                </h3>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-gray-400 italic mb-4">No upcoming deadlines.</p>
                ) : (
                  upcoming.map((deadline) => (
                    <DeadlineCard 
                      key={deadline.id} 
                      deadline={deadline} 
                      onHide={toggleHide}
                      isHidden={hiddenIds.includes(deadline.id)}
                    />
                  ))
                )}
              </div>
            )}

            {/* Overdue Section */}
            {(overdue.length > 0) && (
              <div>
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 border-t pt-4">
                  {overdue.length} Overdue
                </h3>
                {overdue.map((deadline) => (
                  <DeadlineCard 
                    key={deadline.id} 
                    deadline={deadline} 
                    onHide={toggleHide}
                    isHidden={hiddenIds.includes(deadline.id)}
                  />
                ))}
              </div>
            )}
            
            {upcoming.length > 0 && overdue.length === 0 && (
               <div className="mt-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-t pt-4">
                    0 Overdue
                  </h3>
               </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-0 bg-gray-50 flex items-center h-7">
        <a
          href="https://spectrum.um.edu.my"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 leading-none"
        >
          Open Spectrum
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
