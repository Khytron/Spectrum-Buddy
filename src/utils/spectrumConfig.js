/**
 * Centralized configuration for Spectrum (Moodle) selectors, URLs, and patterns.
 * Decouples DOM structure from the data extraction engine for better maintainability.
 */
export const spectrumConfig = {
  urls: {
    base: 'https://spectrum.um.edu.my',
    dashboard: 'https://spectrum.um.edu.my/my/',
    api: 'https://spectrum.um.edu.my/lib/ajax/service.php',
  },

  selectors: {
    // Dashboard Timeline
    // NOTE: Relying on [data-region] is more robust than CSS class nesting.
    timelineRegion: '[data-region="timeline-view"]',
    
    // Upcoming Events Block (Side block)
    upcomingBlock: '.block_calendar_upcoming',
    eventItem: '.event',
    eventLink: 'a', 
    eventDate: '.date',

    // Global Assignment Links (ARIA-based)
    // This is currently the most robust way as Moodle uses standard aria-labels for accessibility.
    deadlineLink: 'a[aria-label*="is due"]',

    // --- DEEP NESTING IDENTIFIED ---
    // The following selectors/checks rely on .parentElement.parentElement nesting.
    // Robust Alternatives Suggested: 
    // 1. Use [data-event-type="assignment"] to find the container.
    // 2. Use [data-region="event-list-item"] to encapsulate all data for one assignment.
    // 3. Look for .badge-success specifically within that container.
    badgeSuccess: '.badge-success', 
    overdueIndicator: '.text-danger', // Often Moodle uses text-danger for overdue
  },

  patterns: {
    // Session extraction
    sesskeyJson: /"sesskey":"([^"]+)"/,
    sesskeyUrl: /sesskey=([\w\d]+)/,

    // Aria-label parsing
    // Format: "Assignment Title activity in Course Name is due on Date"
    ariaLabelFull: /^(.+?)\s+activity\s+in\s+(.+?)\s+is\s+due\s+on\s+(.+)$/i,
    ariaLabelSimple: /^(.+?)\s+is\s+due$/i,

    // Date parsing
    dateFull: /(\d{1,2})\s+(\w+)\s+(\d{4}),?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i,
    timeOnly: /(\d{1,2}):(\d{2})\s*(AM|PM)?/i,
  },

  api: {
    methods: {
      getEvents: 'core_calendar_get_action_events_by_timesort',
    },
  },

  strings: {
    overdue: 'Overdue',
    submittedText: '>Submitted<',
  }
};
