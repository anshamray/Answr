import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import de from './locales/de.json';

export const i18n = createI18n({
  legacy: false,  // Use Composition API mode
  locale: localStorage.getItem('locale') || 'en',
  fallbackLocale: 'en',
  messages: { en, de }
});

// Helper to change locale and persist to localStorage
export function setLocale(locale) {
  i18n.global.locale.value = locale;
  localStorage.setItem('locale', locale);
  document.documentElement.lang = locale;
}

// Available locales
export const availableLocales = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];
