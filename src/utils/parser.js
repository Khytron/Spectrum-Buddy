import { spectrumConfig } from './spectrumConfig';

/**
 * Parses Spectrum (Moodle) HTML to extract assignment deadlines.
 * Uses centralized config for robust, decoupled extraction.
 *
 * @param {string} htmlString - The raw HTML from Spectrum
 * @returns {Array<{id: string, courseName: string, assignmentTitle: string, dueDate: string, link: string, isSubmitted: boolean, isOverdue: boolean}>}
 */
export function parseMoodleDeadlines(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const deadlines = [];

  // Strategy 1: Upcoming Events Side Block
  const upcomingBlock = doc.querySelector(spectrumConfig.selectors.upcomingBlock);
  if (upcomingBlock) {
     const events = upcomingBlock.querySelectorAll(spectrumConfig.selectors.eventItem);
     events.forEach((event, i) => {
        const linkElem = event.querySelector(spectrumConfig.selectors.eventLink);
        const dateElem = event.querySelector(spectrumConfig.selectors.eventDate);
        
        if (linkElem && dateElem) {
           deadlines.push({
             id: `upcoming-block-${i}-${Date.now()}`,
             assignmentTitle: linkElem.innerText.trim(),
             courseName: 'Upcoming Event',
             dueDate: parseDateString(dateElem.innerText.trim()),
             link: normalizeUrl(linkElem.getAttribute('href')),
             isSubmitted: false,
             isOverdue: false
           });
        }
     });
  }

  // Strategy 2: ARIA-labeled Deadline Links (Global search)
  // This is currently the most robust method for Spectrum's Dashboard.
  const deadlineLinks = doc.querySelectorAll(spectrumConfig.selectors.deadlineLink);
  
  deadlineLinks.forEach((link, index) => {
      try {
        const ariaLabel = link.getAttribute('aria-label') || '';
        const parsed = parseAriaLabel(ariaLabel);

        if (!parsed) return;

        // Optimized Extraction Logic
        const parent = link.parentElement;
        const grandParent = parent?.parentElement;
        
        // Check for "Overdue" status
        const isOverdue = parent?.innerHTML?.includes(spectrumConfig.strings.overdue) || 
                          !!parent?.querySelector(spectrumConfig.selectors.overdueIndicator) ||
                          false;
        
        // Check for "Submitted" status
        // Searches for badge-success or explicit text within the container
        const isSubmitted = grandParent?.innerHTML?.includes(spectrumConfig.selectors.badgeSuccess.replace('.', '')) ||
                            grandParent?.innerHTML?.includes(spectrumConfig.strings.submittedText) || 
                            false;

        deadlines.push({
          id: `deadline-${index}-${Date.now()}`,
          courseName: parsed.courseName,
          assignmentTitle: parsed.assignmentTitle,
          dueDate: parsed.dueDate,
          link: normalizeUrl(link.getAttribute('href')),
          isSubmitted,
          isOverdue,
        });
      } catch (error) {
        console.error('[Parser] Error parsing deadline link:', error);
      }
  });

  // Sort: Earliest first
  return deadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

/**
 * Normalizes relative URLs to absolute ones
 */
function normalizeUrl(href) {
  if (!href) return spectrumConfig.urls.base;
  if (href.startsWith('http')) return href;
  return new URL(href, spectrumConfig.urls.base).href;
}

/**
 * Parses the aria-label attribute to extract assignment details
 */
function parseAriaLabel(ariaLabel) {
  let match = ariaLabel.match(spectrumConfig.patterns.ariaLabelFull);
  if (match) {
    const [, assignmentTitle, courseName, dateStr] = match;
    return {
      assignmentTitle: assignmentTitle.trim(),
      courseName: courseName.trim(),
      dueDate: parseDateString(dateStr.trim()),
    };
  }

  match = ariaLabel.match(spectrumConfig.patterns.ariaLabelSimple);
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
 * Parses date string from Spectrum's format into ISO
 */
function parseDateString(dateStr) {
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  const match = dateStr.match(spectrumConfig.patterns.dateFull);
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

  // Handle Relative Dates (Today/Tomorrow)
  const now = new Date();
  const lowerStr = dateStr.toLowerCase();
  
  if (lowerStr.includes('today') || lowerStr.includes('tomorrow')) {
    if (lowerStr.includes('tomorrow')) now.setDate(now.getDate() + 1);
    
    const timeMatch = dateStr.match(spectrumConfig.patterns.timeOnly);
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
