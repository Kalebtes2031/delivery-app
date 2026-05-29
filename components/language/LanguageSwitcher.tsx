import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { useAppLanguage } from "@/hooks/useAppLanguage";

const BRAND_COLOR = "#6750A4";

export function LanguageSwitcher() {
  const { t } = useTranslation("common");
  const { language, setLanguage, supportedLanguages } = useAppLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t("language.title")}
      </Text>
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
                selected ? styles.buttonSelected : styles.buttonUnselected
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  selected ? styles.buttonTextSelected : styles.buttonTextUnselected
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {item.nativeLabel}
              </Text>
              {selected && <MaterialCommunityIcons name="check" size={18} color={BRAND_COLOR} />}
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
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginTop: 16,
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
    borderWidth: 1,
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
});
