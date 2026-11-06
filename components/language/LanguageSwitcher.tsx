import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/context/ThemeContext";

import { useAppLanguage } from "@/hooks/useAppLanguage";

const BRAND_COLOR = "#6750A4";

export function LanguageSwitcher({ showText = true }: { showText?: boolean }) {
  const { t } = useTranslation("common");
  const { language, setLanguage, supportedLanguages } = useAppLanguage();
  const { colors, isDark } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: "transparent" }]}>
      {showText && (
        <Text style={[styles.title, { color: colors.text }]}>
          {t("language.title")}
        </Text>
      )}
      <View style={styles.buttonContainer}>
        {supportedLanguages.map((item) => {
          const selected = item.code === language;
          return (
            <TouchableOpacity
              key={item.code}
              onPress={() => setLanguage(item.code)}
              activeOpacity={0.8}
              style={[
                styles.button,
                selected
                  ? { borderColor: colors.primary, backgroundColor: colors.primarySoft }
                  : { borderColor: colors.border, backgroundColor: isDark ? colors.surface : "#FFFFFF" }
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  selected
                    ? { color: colors.primary }
                    : { color: isDark ? colors.text : "#475569" }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {item.nativeLabel}
              </Text>
              {selected ? (
                <View style={[styles.radioSelected, { borderColor: colors.primary }]}>
                  <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                </View>
              ) : (
                <View style={[styles.radioUnselected, { borderColor: colors.border }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    // padding: 20,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.05,
    // shadowRadius: 10,
    // elevation: 2,
  },
  title: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonSelected: {
    borderColor: BRAND_COLOR,
    backgroundColor: '#F3E8FF',
  },
  buttonUnselected: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  buttonTextSelected: {
    color: BRAND_COLOR,
  },
  buttonTextUnselected: {
    color: '#475569',
  },
  radioSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_COLOR,
  },
  radioUnselected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
});