const STORAGE_KEY = 'tankwars_match_settings';

/**
 * Saves the match settings to localStorage.
 * @param {Object} settings - The settings object to persist.
 */
export function saveMatchSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Loads the match settings from localStorage.
 * @returns {Object|null} The persisted settings or null if not found.
 */
export function loadMatchSettings() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    try {
        return JSON.parse(saved);
    } catch (e) {
        console.error('Error parsing match settings from localStorage', e);
        return null;
    }
}

/**
 * Clears the match settings from localStorage.
 */
export function clearMatchSettings() {
    localStorage.removeItem(STORAGE_KEY);
}
