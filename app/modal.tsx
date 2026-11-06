import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/context/ThemeContext';

export default function ModalScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedText type="title">{t('modal.title', { defaultValue: 'Modal' })}</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">{t('modal.goHome', { defaultValue: 'Go to home screen!' })}</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {   
    marginTop: 15,
    paddingVertical: 15,
  },
});
