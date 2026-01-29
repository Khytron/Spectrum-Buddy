/**
 * Parses Spectrum (Moodle) HTML to extract assignment deadlines.
 * Supports both the Calendar "Upcoming Events" view (preferred) and Dashboard (fallback).
 *
 * @param {string} htmlString - The raw HTML from Spectrum
 * @returns {Array<{id: string, courseName: string, assignmentTitle: string, dueDate: string, link: string, isSubmitted: boolean, isOverdue: boolean}>}
 */
export function parseMoodleDeadlines(htmlString) {
  console.log(`[Parser] Received HTML content (Length: ${htmlString.length})`);
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Debug: Log Page Title
  const pageTitle = doc.querySelector('title')?.innerText || 'No Title';
  console.log(`[Parser] Page Title: "${pageTitle}"`);

  // Debug: Check for Timeline Region
  const timelineRegion = doc.querySelector('[data-region="timeline-view"]');
  if (timelineRegion) {
    console.log('[Parser] Found "timeline-view" container.');
    // Log the first 500 chars of the timeline to see if it's empty/loading
    console.log('[Parser] Timeline innerHTML snippet:', timelineRegion.innerHTML.substring(0, 500));
  } else {
    console.warn('[Parser] "timeline-view" NOT found.');
  }

  const deadlines = [];

  // Strategy 1: Look for "Upcoming Events" block (Side block)
  const upcomingBlock = doc.querySelector('.block_calendar_upcoming');
  if (upcomingBlock) {
     console.log('[Parser] Found "Upcoming Events" side block.');
     const events = upcomingBlock.querySelectorAll('.event');
     events.forEach((event, i) => {
        // Parse side block events...
        // (Simplified logic for debug)
        const link = event.querySelector('a')?.href;
        const title = event.querySelector('a')?.innerText;
        const date = event.querySelector('.date')?.innerText;
        if (title && date) {
           deadlines.push({
             id: `upcoming-block-${i}`,
             assignmentTitle: title,
             courseName: 'Upcoming Event',
             dueDate: parseDateString(date),
             link: link,
             isSubmitted: false,
             isOverdue: false
           });
        }
     });
  }

  // Strategy 2: Dashboard Timeline (The main one)
  // Try to find ANY link in the timeline region
  if (timelineRegion) {
      const timelineLinks = timelineRegion.querySelectorAll('a');
      console.log(`[Parser] Found ${timelineLinks.length} links in timeline region.`);
  }

  // Original Logic: "is due" aria-label
  const deadlineLinks = doc.querySelectorAll('a[aria-label*="is due"]');
  console.log(`[Parser] Found ${deadlineLinks.length} "is due" links.`);

  deadlineLinks.forEach((link, index) => {
      // ... existing parsing logic ...
      try {
        const ariaLabel = link.getAttribute('aria-label') || '';
        const parsed = parseAriaLabel(ariaLabel);

        if (!parsed) return;

        const parent = link.parentElement;
        const hasOverdueBadge = parent?.innerHTML?.includes('Overdue') || false;
        
        const grandParent = parent?.parentElement;
        const isSubmitted = grandParent?.innerHTML?.includes('badge-success') ||
                            grandParent?.innerHTML?.includes('>Submitted<') || false;

        let href = link.getAttribute('href') || '';
        if (href && !href.startsWith('http')) {
          href = new URL(href, 'https://spectrum.um.edu.my').href;
        }

        deadlines.push({
          id: `deadline-${index}-${Date.now()}`,
          courseName: parsed.courseName,
          assignmentTitle: parsed.assignmentTitle,
          dueDate: parsed.dueDate,
          link: href,
          isSubmitted,
          isOverdue: hasOverdueBadge,
        });
      } catch (error) {
        console.error('[Parser] Error parsing deadline link:', error);
      }
  });

  // Sort: Earliest first
  deadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  return deadlines;
}

/**
 * Parses the aria-label attribute to extract assignment details
 * @param {string} ariaLabel
 * @returns {{assignmentTitle: string, courseName: string, dueDate: string} | null}
 */
function parseAriaLabel(ariaLabel) {
  const fullPattern = /^(.+?)\s+activity\s+in\s+(.+?)\s+is\s+due\s+on\s+(.+)$/i;
  const simplePattern = /^(.+?)\s+is\s+due$/i;

  let match = ariaLabel.match(fullPattern);
  if (match) {
    const [, assignmentTitle, courseName, dateStr] = match;
    return {
      assignmentTitle: assignmentTitle.trim(),
      courseName: courseName.trim(),
      dueDate: parseDateString(dateStr.trim()),
    };
  }

  match = ariaLabel.match(simplePattern);
  if (match) {
    return {
      assignmentTitle: match[1].trim(),
      courseName: 'Unknown Course',
      dueDate: new Date().toISOString(),
    };
  }
  return null;
}

/**
 * Parses date string from Spectrum's format
 * @param {string} dateStr - Raw date string
 * @returns {string} - ISO date string
 */
function parseDateString(dateStr) {
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  const match = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4}),?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    const [, day, month, year, hours, minutes, ampm] = match;
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = monthNames.indexOf(month.toLowerCase());
    
    if (monthIndex !== -1) {
      let h = parseInt(hours);
      if (ampm?.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0;
      const date = new Date(parseInt(year), monthIndex, parseInt(day), h, parseInt(minutes));
      return date.toISOString();
    }
  }

  const now = new Date();
  if (dateStr.toLowerCase().includes('today')) {
    const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      const [, hours, minutes, ampm] = timeMatch;
      let h = parseInt(hours);
      if (ampm?.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0;
      now.setHours(h, parseInt(minutes), 0, 0);
    }
    return now.toISOString();
  }

  if (dateStr.toLowerCase().includes('tomorrow')) {
    now.setDate(now.getDate() + 1);
    const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      const [, hours, minutes, ampm] = timeMatch;
      let h = parseInt(hours);
      if (ampm?.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0;
      now.setHours(h, parseInt(minutes), 0, 0);
    }
    return now.toISOString();
  }
  return now.toISOString();
}