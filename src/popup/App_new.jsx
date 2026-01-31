```javascript
import React, { useState, useEffect, useCallback } from 'react';

// Urgency thresholds in milliseconds
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

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

function DeadlineCard({ deadline, onHide }) {
  const urgency = getUrgencyLevel(deadline.dueDate);

  return (
    <div
      className={`border-l-4 p-3 rounded-r-lg mb-2 flex items-start justify-between gap-3 transition-all hover:shadow-md ${URGENCY_STYLES[urgency]}`}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${DOT_STYLES[urgency]}`} />
        <div className="flex-1 min-w-0">
          <a
            href={deadline.link || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-900 hover:text-blue-600 block whitespace-normal break-words"
            title={deadline.assignmentTitle}
          >
            {deadline.assignmentTitle}
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
      </div>
      
      <button
        onClick={() => onHide(deadline.id)}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
        title="Hide Assignment"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243l-4.243-4.243" />
        </svg>
      </button>
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
  const [hiddenAssignments, setHiddenAssignments] = useState([]);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const data = await chrome.storage.local.get(['status', 'deadlines', 'lastFetch', 'error', 'hiddenAssignments']);
    setStatus(data.status || 'LOADING');
    setDeadlines(data.deadlines || []);
    setHiddenAssignments(data.hiddenAssignments || []);
    setLastFetch(data.lastFetch);
    setError(data.error);
  }, []);

  useEffect(() => {
    loadData();

    // Listen for storage changes
    const handleStorageChange = (changes) => {
      if (changes.status) setStatus(changes.status.newValue);
      if (changes.deadlines) setDeadlines(changes.deadlines.newValue || []);
      if (changes.hiddenAssignments) setHiddenAssignments(changes.hiddenAssignments.newValue || []);
      if (changes.lastFetch) setLastFetch(changes.lastFetch.newValue);
      if (changes.error) setError(changes.error.newValue);
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

  const handleHideAssignment = async (assignmentId) => {
    const newHidden = [...new Set([...hiddenAssignments, assignmentId])];
    setHiddenAssignments(newHidden);
    await chrome.storage.local.set({ hiddenAssignments: newHidden });
  };

  const handleShowAll = async () => {
    setHiddenAssignments([]);
    await chrome.storage.local.set({ hiddenAssignments: [] });
  };

  const formatLastFetch = () => {
    if (!lastFetch) return '';
    const date = new Date(lastFetch);
    return `Updated ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Filter out hidden assignments first
  const visibleDeadlines = deadlines.filter(d => !hiddenAssignments.includes(d.id));

  // Categorize deadlines
  const upcoming = [];
  const overdue = [];
  const now = Date.now();

  visibleDeadlines.forEach((d) => {
    if (d.isSubmitted) return; // Skip submitted items
    const dueTime = new Date(d.dueDate).getTime();
    if (dueTime < now) {
      overdue.push(d);
    } else {
      upcoming.push(d);
    }
  });

  return (
    <div className="min-h-[400px] bg-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Spectrum Buddy</h1>
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
        <p className="text-xs text-blue-100 mt-1">Made by a student, for students</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {status === 'LOADING' && <LoadingView />}
        {status === 'NEEDS_LOGIN' && <NeedsLoginView />}
        {status === 'ERROR' && <ErrorView error={error} />}
        
        {status === 'OK' && (
          <>
            {hiddenAssignments.length > 0 && (
              <div className="mb-4 text-center">
                <button
                  onClick={handleShowAll}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg w-full"
                >
                  Show {hiddenAssignments.length} hidden assignment{hiddenAssignments.length > 1 ? 's' : ''}
                </button>
              </div>
            )}

            {visibleDeadlines.length === 0 && deadlines.length > 0 && hiddenAssignments.length > 0 ? (
              <div className="text-center py-8 px-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">All visible items cleared!</h2>
                <p className="text-sm text-gray-600">You've hidden all assignments.</p>
              </div>
            ) : visibleDeadlines.length === 0 && <EmptyView />}
            
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
                    <DeadlineCard key={deadline.id} deadline={deadline} onHide={handleHideAssignment} />
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
                  <DeadlineCard key={deadline.id} deadline={deadline} onHide={handleHideAssignment} />
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

      {/* Footer */}
      <div className="border-t px-4 py-2 bg-gray-50">
        <a
          href="https://spectrum.um.edu.my"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
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
```
