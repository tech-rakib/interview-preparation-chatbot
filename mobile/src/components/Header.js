import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function Header({ title = 'Interview Prep AI' }) {
  const { user, logout } = useContext(AuthContext);
  const { theme, isDark, toggleTheme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingTop: Math.max(insets.top, 10) + 10,
          backgroundColor: theme.card,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <View style={styles.titleRow}>
        <View style={[styles.iconBadge, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="chatbubbles" size={24} color={theme.primary} />
        </View>
        <Text style={[styles.titleText, { color: theme.primary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.themeButton, { backgroundColor: theme.inputBg }]}
          onPress={toggleTheme}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={isDark ? '#F59E0B' : '#4F46E5'} />
        </TouchableOpacity>

        {user && (
          <>
            <Text style={[styles.userEmail, { color: theme.subtext }]} numberOfLines={1} ellipsizeMode="tail">
              {user.name || user.email}
            </Text>
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.errorBg }]} onPress={logout} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color={theme.errorText} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    flexShrink: 1,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeButton: {
    padding: 7,
    borderRadius: 10,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 90,
  },
  logoutButton: {
    padding: 7,
    borderRadius: 10,
  },
});