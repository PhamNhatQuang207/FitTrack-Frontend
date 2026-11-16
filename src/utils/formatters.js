const LOCALE_MAP = { en: 'en-US', vi: 'vi-VN' };

/**
 * Format a date using Intl.DateTimeFormat for the given language ('en' or 'vi').
 */
export function formatDate(date, lang = 'en', options = { dateStyle: 'medium' }) {
  if (!date) return '';
  const key = String(lang || 'en').startsWith('vi') ? 'vi' : 'en';
  return new Intl.DateTimeFormat(LOCALE_MAP[key], options).format(new Date(date));
}

/**
 * Format a number using Intl.NumberFormat for the given language ('en' or 'vi').
 */
export function formatNumber(value, lang = 'en', options) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  const key = String(lang || 'en').startsWith('vi') ? 'vi' : 'en';
  return new Intl.NumberFormat(LOCALE_MAP[key], options).format(Number(value));
}
