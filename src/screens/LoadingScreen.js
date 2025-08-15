import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, THEME } from '../constants/colors';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestão IST</Text>
      <ActivityIndicator 
        size="large" 
        color={COLORS.primary[500]} 
        style={styles.loader}
      />
      <Text style={styles.subtitle}>Carregando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: THEME.fontSize.xxxl,
    fontWeight: THEME.fontWeight.bold,
    color: COLORS.primary[500],
    marginBottom: THEME.spacing.xl,
  },
  loader: {
    marginVertical: THEME.spacing.lg,
  },
  subtitle: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[600],
  },
});