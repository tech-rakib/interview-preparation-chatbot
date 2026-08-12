import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'hide-expo-dev-menu-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          /* Hide Expo Web Dev Launcher / Dev Tools floating gear button */
          #expo-dev-menu-launcher,
          #expo-dev-menu,
          [class*="expo-dev"],
          [class*="dev-menu"],
          [data-testid*="expo-dev-menu"],
          div[style*="position: fixed"][style*="bottom"] button,
          div[style*="position: fixed"][style*="top"] button,
          div[style*="position: fixed"][style*="bottom: 20px"][style*="left: 20px"],
          div[style*="position: fixed"][style*="bottom: 16px"][style*="left: 16px"],
          div[style*="position: fixed"][style*="bottom: 24px"][style*="left: 24px"],
          div[style*="position: fixed"][style*="bottom: 10px"][style*="left: 10px"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

