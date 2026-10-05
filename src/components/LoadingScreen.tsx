import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

export function LoadingScreen({ onLayout }: { onLayout?: (event: LayoutChangeEvent) => void }) {
  return (
    <View style={styles.screen} onLayout={onLayout}>
      <StatusBar style="light" />
      <Image source={require('../../assets/icon.png')} style={styles.mark} />
      <Text style={styles.wordmark}>NOMA</Text>
      <Text style={styles.tagline}>Thoughtful seating for focused work.</Text>
      <ActivityIndicator color="#F4EFE6" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1C2D29',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  mark: {
    width: 120,
    height: 120,
    borderRadius: 28,
    marginBottom: 28,
  },
  wordmark: {
    color: '#F4EFE6',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
  },
  tagline: {
    color: '#D5DDD6',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  spinner: {
    marginTop: 28,
  },
});
