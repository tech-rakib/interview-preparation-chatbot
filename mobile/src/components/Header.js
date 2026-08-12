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
        { paddingTop: insets.top + 14, backgroundColor: theme.card, borderBottomColor: theme.border },
      ]}
    >
      <View style={styles.titleRow}>
        <View style={[styles.iconBadge, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="chatbubbles" size={26} color={theme.primary} />
        </View>
        <Text style={[styles.titleText, { color: theme.primary }]}>{title}</Text>
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.themeButton, { backgroundColor: theme.inputBg }]}
          onPress={toggleTheme}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={isDark ? '#F59E0B' : '#4F46E5'} />
        </TouchableOpacity>

        {user && (
          <>
            <Text style={[styles.userEmail, { color: theme.subtext }]} numberOfLines={1}>
              {user.name || user.email}
            </Text>
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.errorBg }]} onPress={logout} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={22} color={theme.errorText} />
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
    paddingBottom: 14,
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
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeButton: {
    padding: 8,
    borderRadius: 10,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '600',
    maxWidth: 110,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 10,
  },
});