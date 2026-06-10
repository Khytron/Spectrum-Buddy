import React, { useState, useEffect, useCallback, useRef } from 'react';
import browser from '../utils/browser-polyfill';

// Urgency thresholds in milliseconds
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

const DEFAULT_PREFERENCES = {
  notificationsEnabled: true,
  reminderOffsets: [2880, 1440, 60],
  customOffsets: [],
  refreshMinutes: 5,
};

const REMINDER_OPTIONS = [
  { label: '48 hours before', value: 2880 },
  { label: '24 hours before', value: 1440 },
  { label: '1 hour before', value: 60 },
];

/**
 * Determines the urgency level of a deadline
 */
function getUrgencyLevel(dueDate) {
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const diff = due - now;

  if (diff < 0) return 'gray';
  if (diff < ONE_DAY_MS) return 'red';
  if (diff < FOUR_DAYS_MS) return 'yellow';
  return 'green';
}

/**
 * Formats a date for display
 */
function formatDueDate(isoDate) {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  
  if (diffMs < 0) {
    return `Past due (${date.toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
  }

  const diffMinsTotal = Math.floor(diffMs / (1000 * 60));
  const diffHoursTotal = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDaysTotal = Math.floor(diffHoursTotal / 24);
  
  let timeLeftStr;
  if (diffHoursTotal > 96) {
    timeLeftStr = `${diffDaysTotal}d`;
  } else if (diffHoursTotal >= 1) {
    timeLeftStr = `${diffHoursTotal}h`;
  } else {
    timeLeftStr = `${diffMinsTotal}min`;
  }

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDue - startOfNow) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return `Today, ${timeStr}, ${timeLeftStr}`;
  if (diffDays === 1) return `Tomorrow, ${timeStr}, ${timeLeftStr}`;
  if (diffDays < 7) return `${date.toLocaleDateString([], { weekday: 'short' })}, ${timeStr}, ${timeLeftStr}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}, ${timeLeftStr}`;
}

function normalizePreferences(prefs) {
  const reminderOffsets = Array.isArray(prefs.reminderOffsets)
    ? prefs.reminderOffsets.filter((value) => Number.isFinite(value) && value > 0)
    : DEFAULT_PREFERENCES.reminderOffsets;

  const FIXED_OFFSETS = REMINDER_OPTIONS.map(opt => opt.value);
  
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
    // Migration
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
    customOffsets: uniqueCustom,
    refreshMinutes: DEFAULT_PREFERENCES.refreshMinutes,
  };
}

const URGENCY_STYLES = {
  red: 'border-l-red-500 bg-red-50',
  yellow: 'border-l-yellow-500 bg-yellow-50',
  green: 'border-l-green-500 bg-green-50',
  gray: 'border-l-gray-500 bg-gray-100',
};

const DOT_STYLES = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  gray: 'bg-gray-500',
};

const COURSE_COLORS = [
  { bg: 'bg-blue-50', title: 'text-blue-800', desc: 'text-blue-600/70', border: 'border-blue-100', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
  { bg: 'bg-emerald-50', title: 'text-emerald-800', desc: 'text-emerald-600/70', border: 'border-emerald-100', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  { bg: 'bg-amber-50', title: 'text-amber-800', desc: 'text-amber-600/70', border: 'border-amber-100', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
  { bg: 'bg-red-50', title: 'text-red-800', desc: 'text-red-600/70', border: 'border-red-100', iconBg: 'bg-red-100', iconText: 'text-red-600' },
  { bg: 'bg-purple-50', title: 'text-purple-800', desc: 'text-purple-600/70', border: 'border-purple-100', iconBg: 'bg-purple-100', iconText: 'text-purple-600' },
  { bg: 'bg-pink-50', title: 'text-pink-800', desc: 'text-pink-600/70', border: 'border-pink-100', iconBg: 'bg-pink-100', iconText: 'text-pink-600' },
  { bg: 'bg-fuchsia-50', title: 'text-fuchsia-800', desc: 'text-fuchsia-600/70', border: 'border-fuchsia-100', iconBg: 'bg-fuchsia-100', iconText: 'text-fuchsia-600' },
  { bg: 'bg-cyan-50', title: 'text-cyan-800', desc: 'text-cyan-600/70', border: 'border-cyan-100', iconBg: 'bg-cyan-100', iconText: 'text-cyan-600' },
];

// Helper to shuffle colors for randomness
const shuffledColors = [...COURSE_COLORS].sort(() => Math.random() - 0.5);

const getCourseStyle = (index) => {
  return shuffledColors[index % shuffledColors.length];
};

function DeadlineCard({ deadline, onHide, isHidden }) {
  const urgency = getUrgencyLevel(deadline.dueDate);

  return (
    <div className={`group relative border-l-4 p-3 rounded-r-lg mb-2 transition-all hover:shadow-md ${URGENCY_STYLES[urgency]} ${isHidden ? 'opacity-50 grayscale' : ''}`}>
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
          <p className="text-xs text-gray-600 truncate">{deadline.courseName || 'Unknown Course'}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">{formatDueDate(deadline.dueDate)}</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); onHide(deadline.id); }}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded-full"
          title={isHidden ? "Unhide assignment" : "Hide assignment"}
        >
          {isHidden ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
  return (
    <div className="text-center py-8 px-4">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-4V9m0 0V7m0 2h2m-2 0H9" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Session Expired</h2>
      <button 
        onClick={() => browser.tabs.create({ url: 'https://spectrum.um.edu.my' })} 
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        title="Open the UM Spectrum Page"
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
      <p className="text-sm text-gray-600">Log in to Spectrum and Refresh Extension</p>
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
      <p className="text-sm text-gray-600">No upcoming deadlines found.</p>
    </div>
  );
}

/**
 * Component for custom reminder inputs
 */
function CustomReminderInput({ item, checked, isOffsetUsed, onToggle, onUpdate, onRemove, disabled }) {
  const { offset, mode } = item;
  const isDays = mode === 'days';
  const divisor = isDays ? 1440 : 60;
  const [value, setValue] = useState(Math.round(offset / divisor));

  useEffect(() => {
    setValue(Math.round(offset / divisor));
  }, [offset, divisor]);

  const handleBlur = () => {
    const num = parseInt(value, 10);
    const min = 1;
    const max = isDays ? 30 : 999;
    
    if (!isNaN(num) && num >= min && num <= max) {
      onUpdate(offset, { offset: num * divisor, mode });
    } else {
      setValue(Math.round(offset / divisor));
    }
  };

  const handleModeToggle = () => {
    if (disabled) return;
    const nextMode = isDays ? 'hours' : 'days';
    const nextDivisor = nextMode === 'days' ? 1440 : 60;
    
    let nextValue = nextMode === 'days' ? 3 : 12;
    const limit = nextMode === 'days' ? 30 : 999;
    while (isOffsetUsed(nextValue * nextDivisor) && nextValue < limit) {
      nextValue++;
    }
    
    onUpdate(offset, { offset: nextValue * nextDivisor, mode: nextMode });
  };

  const valInt = parseInt(value, 10);
  const unitText = isDays ? (valInt === 1 ? 'day' : 'days') : (valInt === 1 ? 'hour' : 'hours');

  return (
    <div className={`flex items-center gap-3 text-xs text-gray-700 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={onToggle}
          disabled={disabled}
        />
        <div className="flex items-center gap-1.5">
          <input 
            type="number" 
            value={value} 
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            className="w-[28px] border rounded px-1 py-0.5 text-center text-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="flex items-center gap-1 text-gray-600">
            <button 
              onClick={handleModeToggle}
              disabled={disabled}
              className="hover:text-blue-600 underline decoration-dotted underline-offset-2 transition-colors"
            >
              {unitText}
            </button>
            <span>before</span>
          </div>
        </div>
      </div>
      <button 
        onClick={() => onRemove(offset)} 
        disabled={disabled}
        className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-gray-100 flex-shrink-0"
        title="Remove reminder"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-red-600 font-bold mb-2">Something went wrong</h2>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Reload Extension</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [status, setStatus] = useState('LOADING');
  const [deadlines, setDeadlines] = useState([]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [showHidden, setShowHidden] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [showSettings, setShowSettings] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showCourses, setShowCourses] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');

  const scrollContainerRef = useRef(null);

  const loadData = useCallback(async () => {
    const data = await browser.storage.local.get(['status', 'deadlines', 'courses', 'lastFetch', 'error', 'hiddenAssignments', 'preferences']);
    setStatus(data.status || 'LOADING');
    setDeadlines(data.deadlines || []);
    setCourses(data.courses || []);
    setLastFetch(data.lastFetch);
    setError(data.error);
    setHiddenIds(data.hiddenAssignments || []);
    setPreferences(normalizePreferences(data.preferences || {}));
  }, []);

  useEffect(() => {
    loadData();
    const handleStorageChange = (changes) => {
      if (changes.status) setStatus(changes.status.newValue);
      if (changes.deadlines) setDeadlines(changes.deadlines.newValue || []);
      if (changes.courses) setCourses(changes.courses.newValue || []);
      if (changes.lastFetch) setLastFetch(changes.lastFetch.newValue);
      if (changes.error) setError(changes.error.newValue);
      if (changes.hiddenAssignments) setHiddenIds(changes.hiddenAssignments.newValue || []);
      if (changes.preferences) setPreferences(normalizePreferences(changes.preferences.newValue || {}));
    };
    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, [loadData]);

  // Scroll to top when settings are opened
  useEffect(() => {
    if (showSettings && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showSettings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await browser.runtime.sendMessage({ action: 'refreshDeadlines' }); }
    finally { setTimeout(() => setIsRefreshing(false), 1000); }
  };

  const updatePreferences = async (updates) => {
    const nextPreferences = normalizePreferences({ ...preferences, ...updates });
    setPreferences(nextPreferences);
    await browser.storage.local.set({ preferences: nextPreferences });
    await browser.runtime.sendMessage({ action: 'updatePreferences', preferences: nextPreferences });
  };

  const toggleHide = async (id) => {
    const newHiddenIds = hiddenIds.includes(id) ? hiddenIds.filter(hid => hid !== id) : [...hiddenIds, id];
    setHiddenIds(newHiddenIds);
    await browser.storage.local.set({ hiddenAssignments: newHiddenIds });
  };

  const isOffsetUsed = (off) => preferences.reminderOffsets.includes(off) || preferences.customOffsets.some(c => c.offset === off);

  const handleAddCustomReminder = () => {
    const currentCustom = preferences.customOffsets;
    if (currentCustom.length >= 3) return;

    let newOffset = 720; // Default 12 hours
    while (isOffsetUsed(newOffset) && newOffset < 999 * 60) {
      newOffset += 60;
    }
    
    const newItem = { offset: newOffset, mode: 'hours' };
    updatePreferences({ 
      customOffsets: [...currentCustom, newItem],
      reminderOffsets: [...preferences.reminderOffsets, newOffset]
    });
  };

  const handleRemoveCustomReminder = (offset) => {
    updatePreferences({ 
      customOffsets: preferences.customOffsets.filter(v => v.offset !== offset),
      reminderOffsets: preferences.reminderOffsets.filter(v => v !== offset) 
    });
  };

  const handleUpdateCustomReminder = (oldOffset, newItem) => {
    const nextCustom = preferences.customOffsets.map(v => v.offset === oldOffset ? newItem : v);
    const nextActive = preferences.reminderOffsets.includes(oldOffset)
      ? preferences.reminderOffsets.map(v => v === oldOffset ? newItem.offset : v)
      : preferences.reminderOffsets;

    updatePreferences({ 
      customOffsets: nextCustom,
      reminderOffsets: nextActive
    });
  };

  const upcoming = [];
  const overdue = [];
  const now = Date.now();
  const availableCourses = Array.from(new Set(deadlines.map((d) => d.courseName).filter(Boolean))).sort();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredDeadlines = deadlines.filter((d) => {
    if (!showHidden && hiddenIds.includes(d.id)) return false;
    if (selectedCourse !== 'ALL' && d.courseName !== selectedCourse) return false;
    if (normalizedSearch) {
      const haystack = `${d.assignmentTitle || ''} ${d.courseName || ''}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });

  const activeHiddenCount = deadlines.filter(d => hiddenIds.includes(d.id)).length;

  filteredDeadlines.forEach((d) => {
    const dueTime = new Date(d.dueDate).getTime();
    if (dueTime < now) overdue.push(d); else upcoming.push(d);
  });

  return (
    <div className="w-80 h-[360px] bg-white flex flex-col relative">
      {showSupport && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center p-4 border-b relative">
            <h2 className="text-lg font-bold text-gray-800 w-full text-center">Feedback</h2>
            <button 
              onClick={() => setShowSupport(false)} 
              className="absolute right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Close Feedback page"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            <div className="space-y-2">
              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLSdvAG6lbVmUOsU2QL-jBigugY4Xy6VVyD2E0PLKKaHhJJFaqg/viewform?usp=publish-editor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-2 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-xl text-sm flex items-center gap-3 transition-all border border-blue-100 hover:shadow-sm"
                title="Open Bug Report Google Form"
              >
                <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-blue-800">Bug Report</span>
                  <span className="text-[11px] font-normal text-blue-600/70 mt-0.5">Tell us what went wrong</span>
                </div>
              </a>

              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLSeqM2EhYNNmsYt0YvMisIIvarD4dpXz7VbhkHRDz2XKE7JKCg/viewform?usp=dialog" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-2 px-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-xl text-sm flex items-center gap-3 transition-all border border-emerald-100 hover:shadow-sm"
                title="Open Suggest Features Google Form"
              >
                <div className="p-1.5 bg-emerald-100 rounded-lg shrink-0">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-emerald-800">Suggest Features</span>
                  <span className="text-[11px] font-normal text-emerald-600/70 mt-0.5">Help us make it better</span>
                </div>
              </a>

              <a 
                href="https://chromewebstore.google.com/detail/spectrum-buddy/clcinnekpkoppadokbglajalocblfdpm" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-2 px-4 bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold rounded-xl text-sm flex items-center gap-3 transition-all border border-amber-100 hover:shadow-sm"
                title="Rate Spectrum Buddy on Chrome Web Store"
              >
                <div className="p-1.5 bg-amber-100 rounded-lg shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-amber-800">Rate Spectrum Buddy</span>
                  <span className="text-[11px] font-normal text-amber-600/70 mt-0.5">Support us with a review!</span>
                </div>
              </a>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-3">Contact Me</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-2">
                  <div className="text-blue-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <span className="text-[11px] text-gray-600 font-medium">ikhmalhakimie006@gmail.com</span>
                </div>
                <div className="flex items-center gap-2 px-2">
                  <div className="text-green-500">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <span className="text-[11px] text-gray-600 font-medium">+601173140563</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCourses && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center p-4 border-b relative">
            <h2 className="text-lg font-bold text-gray-800 w-full text-center">Courses</h2>
            <button 
              onClick={() => setShowCourses(false)} 
              className="absolute right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Close Courses page"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {courses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <svg className="w-12 h-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-sm font-medium">No courses found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {courses.map((course) => {
                  const style = getCourseStyle(course.id, course.fullname);
                  return (
                    <a 
                      key={course.id}
                      href={course.announcementsCmid 
                        ? `https://spectrum.um.edu.my/mod/forum/view.php?id=${course.announcementsCmid}`
                        : course.viewurl || `https://spectrum.um.edu.my/course/view.php?id=${course.id}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-full py-2.5 px-4 ${style.bg} ${style.title} hover:bg-opacity-80 font-bold rounded-xl text-xs flex items-center gap-3 transition-all border ${style.border} hover:shadow-sm group`}
                      title={`Open ${course.fullname}`}
                    >
                      <div className="flex flex-col items-start leading-tight overflow-hidden">
                        <span className="truncate w-full">{course.fullname}</span>
                        <span className={`text-[9px] font-normal ${style.desc} mt-0.5`}>{course.shortname}</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Spectrum Buddy</h1>
          <div className="flex items-center gap-2">
            {activeHiddenCount > 0 && (
              <button
                onClick={() => setShowHidden(!showHidden)}
                className={`p-1.5 rounded-full transition-colors text-xs flex items-center gap-1 ${showHidden ? 'bg-white/30' : 'hover:bg-white/20'}`}
                title={showHidden ? "Hide hidden assignments" : "Show hidden assignments"}
              >
                {showHidden ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.05 0 01-4.132 5.411m0 0L21 21" /></svg>}
                <span>{activeHiddenCount}</span>
              </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-full transition-colors ${showSettings ? 'bg-white/30' : 'hover:bg-white/20'}`}
              title={showSettings ? "Close settings" : "Open settings"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
              title="Refresh extension"
            >
              <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>
        <p className="text-xs text-blue-100 mt-1">Keep track of your tutorial/assignments</p>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3">
        {status === 'LOADING' && <LoadingView />}
        {status === 'NEEDS_LOGIN' && <NeedsLoginView />}
        {status === 'ERROR' && <ErrorView error={error} />}
        {status === 'OK' && (
          <>
            {showSettings && (
              <div className="mb-4 rounded-lg border bg-gray-50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-semibold text-gray-700">Notifications</p><p className="text-xs text-gray-500">Get reminders before deadlines.</p></div>
                  <label 
                    className="inline-flex items-center cursor-pointer"
                    title={preferences.notificationsEnabled ? "Close notifications" : "Open notifications"}
                  >
                    <input type="checkbox" className="sr-only" checked={preferences.notificationsEnabled} onChange={(e) => updatePreferences({ notificationsEnabled: e.target.checked })} />
                    <div className={`w-10 h-5 rounded-full transition-colors ${preferences.notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}><span className={`block w-3 h-3 bg-white rounded-full mt-1 ml-1 transition-transform ${preferences.notificationsEnabled ? 'translate-x-5' : ''}`} /></div>
                  </label>
                </div>
                <div><p className="text-xs font-semibold text-gray-600 mb-2">Reminder times</p>
                  <div className="flex flex-col gap-2">
                    {REMINDER_OPTIONS.map((option) => (
                      <label key={option.value} className={`text-xs text-gray-700 flex items-center gap-2 ${!preferences.notificationsEnabled ? 'opacity-50' : ''}`}>
                        <input type="checkbox" checked={preferences.reminderOffsets.includes(option.value)} disabled={!preferences.notificationsEnabled} onChange={() => {
                          const current = preferences.reminderOffsets;
                          const nextOffsets = current.includes(option.value) ? current.filter((v) => v !== option.value) : [...current, option.value];
                          const updates = { reminderOffsets: nextOffsets };
                          if (nextOffsets.length === 0) updates.notificationsEnabled = false;
                          updatePreferences(updates);
                        }} />{option.label}
                      </label>
                    ))}

                    {/* Custom Reminders */}
                    {preferences.customOffsets
                      .map((item) => (
                        <CustomReminderInput 
                          key={item.offset} 
                          item={item}
                          checked={preferences.reminderOffsets.includes(item.offset)}
                          isOffsetUsed={isOffsetUsed}
                          onToggle={() => {
                            const offset = item.offset;
                            const current = preferences.reminderOffsets;
                            const nextOffsets = current.includes(offset) ? current.filter((v) => v !== offset) : [...current, offset];
                            const updates = { reminderOffsets: nextOffsets };
                            if (nextOffsets.length === 0 && REMINDER_OPTIONS.every(opt => !preferences.reminderOffsets.includes(opt.value))) updates.notificationsEnabled = false;
                            updatePreferences(updates);
                          }}
                          onUpdate={handleUpdateCustomReminder} 
                          onRemove={handleRemoveCustomReminder}
                          disabled={!preferences.notificationsEnabled}
                        />
                      ))}

                    {/* Add Button */}
                    {preferences.customOffsets.length < 3 && (
                      <button 
                        onClick={handleAddCustomReminder}
                        disabled={!preferences.notificationsEnabled}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 mt-1 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                        Add custom reminder
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="mb-3 space-y-2">
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Search Courses or Assignments" 
                className="w-full border rounded px-2 py-1 text-sm"
                title={searchTerm ? "" : "Search your keywords"}
              />
            </div>
            {upcoming.length === 0 && overdue.length === 0 && <EmptyView />}
            {upcoming.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{upcoming.length} Upcoming Deadline{upcoming.length !== 1 ? 's' : ''}</h3>
                {upcoming.map((d) => <DeadlineCard key={d.id} deadline={d} onHide={toggleHide} isHidden={hiddenIds.includes(d.id)} />)}
              </div>
            )}
            {overdue.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 border-t pt-4">{overdue.length} Overdue</h3>
                {overdue.map((d) => <DeadlineCard key={d.id} deadline={d} onHide={toggleHide} isHidden={hiddenIds.includes(d.id)} />)}
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t px-4 py-0 bg-gray-50 flex items-center justify-between h-8">
        <a 
          href="https://spectrum.um.edu.my" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 leading-none"
          title="Open the UM Spectrum Page"
        >
          Open Spectrum <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setShowCourses(true)} 
            className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium transition-colors bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full leading-none border border-blue-100"
            title="Open Courses page"
          >
            Courses
          </button>
          <button 
            onClick={() => setShowSupport(true)} 
            className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium transition-colors bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full leading-none border border-blue-100"
            title="Open Feedback page"
          >
            Feedback
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() { return ( <ErrorBoundary><AppContent /></ErrorBoundary> ); }
