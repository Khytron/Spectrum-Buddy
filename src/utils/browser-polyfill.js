import browser from 'webextension-polyfill';

/**
 * Cross-browser extension API wrapper.
 * Using webextension-polyfill to provide a unified 'browser' namespace 
 * that works in both Chrome (via chrome.*) and Firefox.
 */
export default browser;
