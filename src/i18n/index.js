import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import commonEn from '../locales/en/common.json';
import commonVi from '../locales/vi/common.json';
import errorsEn from '../locales/en/errors.json';
import errorsVi from '../locales/vi/errors.json';
import authEn from '../locales/en/auth.json';
import authVi from '../locales/vi/auth.json';
import dashboardEn from '../locales/en/dashboard.json';
import dashboardVi from '../locales/vi/dashboard.json';
import workoutEn from '../locales/en/workout.json';
import workoutVi from '../locales/vi/workout.json';
import planEn from '../locales/en/plan.json';
import planVi from '../locales/vi/plan.json';
import progressEn from '../locales/en/progress.json';
import progressVi from '../locales/vi/progress.json';
import profileEn from '../locales/en/profile.json';
import profileVi from '../locales/vi/profile.json';
import aiEn from '../locales/en/ai.json';
import aiVi from '../locales/vi/ai.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        errors: errorsEn,
        auth: authEn,
        dashboard: dashboardEn,
        workout: workoutEn,
        plan: planEn,
        progress: progressEn,
        profile: profileEn,
        ai: aiEn,
      },
      vi: {
        common: commonVi,
        errors: errorsVi,
        auth: authVi,
        dashboard: dashboardVi,
        workout: workoutVi,
        plan: planVi,
        progress: progressVi,
        profile: profileVi,
        ai: aiVi,
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'vi'],
    load: 'languageOnly',
    defaultNS: 'common',
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
