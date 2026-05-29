import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LANGUAGE } from "./languages";
import { defaultNS, resources } from "./resources";
import { getStoredLanguage, normalizeLanguage } from "./storage";

let initPromise: Promise<typeof i18n> | null = null;

export async function initI18n() {
  if (i18n.isInitialized) return i18n;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const storedLanguage = await getStoredLanguage();
    const deviceLanguage = normalizeLanguage(getLocales()[0]?.languageTag);

    await i18n.use(initReactI18next).init({
      compatibilityJSON: "v4",
      defaultNS,
      fallbackLng: DEFAULT_LANGUAGE,
      interpolation: {
        escapeValue: false,
      },
      lng: storedLanguage ?? deviceLanguage,
      ns: Object.keys(resources.en),
      resources,
      supportedLngs: Object.keys(resources),
      react: {
        useSuspense: false,
      },
    });

    return i18n;
  })();

  return initPromise;
}

export default i18n;
