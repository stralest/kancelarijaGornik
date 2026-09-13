import { useEffect, useState } from 'react';
import { translations } from './translations';
import { LanguageContext } from './language-context';

const storageKey = 'gornik-language';

export function LanguageProvider({ children }) {
  // Match the server-rendered Serbian HTML on the first client render.
  const [language, setLanguage] = useState('sr');

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === 'en') queueMicrotask(() => setLanguage('en'));
    } catch {
      // The language switch still works when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translations[language].pageTitle;
  }, [language]);

  const changeLanguage = (nextLanguage) => {
    if (nextLanguage !== 'sr' && nextLanguage !== 'en') return;
    setLanguage(nextLanguage);
    try {
      localStorage.setItem(storageKey, nextLanguage);
    } catch {
      // Keep the in-memory selection if storage is unavailable.
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}
