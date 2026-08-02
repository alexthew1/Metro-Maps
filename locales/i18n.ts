import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from './en.json';
import es from './es.json';
import ja from './ja.json';
import pt from './pt.json';

const LOCALE_PERSISTENCE_KEY = 'language';

const languageDetector: any = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: any) => {
    try {
      const storedLanguage = await AsyncStorage.getItem(LOCALE_PERSISTENCE_KEY);
      if (storedLanguage) {
        return callback(storedLanguage);
      }
    } catch (error) {
      console.log('Error reading language', error);
    }
    // Fallback to device language
    callback(Localization.getLocales()[0]?.languageCode || 'en');
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LOCALE_PERSISTENCE_KEY, language);
    } catch (error) {
      console.log('Error saving language', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      ja: { translation: ja },
      pt: { translation: pt },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
