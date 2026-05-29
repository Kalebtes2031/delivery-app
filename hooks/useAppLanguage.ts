import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  isSupportedLanguage,
} from "@/i18n/languages";
import { storeLanguage } from "@/i18n/storage";

export function useAppLanguage() {
  const { i18n } = useTranslation();
  const language = isSupportedLanguage(i18n.language)
    ? i18n.language
    : (i18n.language?.split("-")[0] as SupportedLanguage);

  const setLanguage = useCallback(
    async (nextLanguage: SupportedLanguage) => {
      await i18n.changeLanguage(nextLanguage);
      await storeLanguage(nextLanguage);
    },
    [i18n],
  );

  return {
    isAmharic: language === "am",
    language: isSupportedLanguage(language) ? language : "en",
    setLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
