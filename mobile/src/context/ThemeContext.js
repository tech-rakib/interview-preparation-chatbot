import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const themeTokens = {
  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    subtext: '#64748B',
    border: '#E2E8F0',
    primary: '#4F46E5',
    primaryLight: '#EEF2FF',
    inputBg: '#F1F5F9',
    userBubble: '#4F46E5',
    botBubble: '#FFFFFF',
    scoreBg: '#D1FAE5',
    scoreText: '#065F46',
    errorBg: '#FEE2E2',
    errorText: '#DC2626',
    modalOverlay: 'rgba(15, 23, 42, 0.6)',
  },
  dark: {
    background: '#0F172A',
    card: '#1E293B',
    text: '#F8FAFC',
    subtext: '#94A3B8',
    border: '#334155',
    primary: '#6366F1',
    primaryLight: '#312E81',
    inputBg: '#334155',
    userBubble: '#6366F1',
    botBubble: '#1E293B',
    scoreBg: '#064E3B',
    scoreText: '#A7F3D0',
    errorBg: '#7F1D1D',
    errorText: '#FCA5A5',
    modalOverlay: 'rgba(0, 0, 0, 0.75)',
  },
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    loadStoredTheme();
  }, []);

  const loadStoredTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('user_theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      } else {
        setIsDark(systemColorScheme === 'dark');
      }
    } catch (e) {
      console.error('Failed to load theme preference', e);
    }
  };

  const toggleTheme = async () => {
    try {
      const nextTheme = !isDark;
      setIsDark(nextTheme);
      await AsyncStorage.setItem('user_theme', nextTheme ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const theme = isDark ? themeTokens.dark : themeTokens.light;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};
