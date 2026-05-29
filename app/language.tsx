import { View, StyleSheet, StatusBar } from 'react-native';
import React from 'react';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from '@/components/BackButton';
import { useTranslation } from "react-i18next";

export default function LanguageScreen() {
    const { t } = useTranslation("common");

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <BackButton title={t("language.title")} color="gray" />
            
            <View style={styles.content}>
                <LanguageSwitcher />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
    }
});