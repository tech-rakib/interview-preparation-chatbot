import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useContext(AuthContext);
  const { theme, isDark, toggleTheme } = useContext(ThemeContext);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      console.error('Register error detail:', err);
      let msg = 'Registration failed. Please try again.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('Network Error')) {
        msg = 'Cannot connect to server. Ensure phone and PC are on the same Wi-Fi and backend is running.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.themeToggle, { backgroundColor: theme.inputBg }]}
            onPress={toggleTheme}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={isDark ? '#F59E0B' : '#4F46E5'} />
          </TouchableOpacity>

          <View style={[styles.logoBadge, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="person-add" size={40} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Sign up to start practicing coding interviews
          </Text>

          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.errorBg }]}>
              <Ionicons name="alert-circle" size={22} color={theme.errorText} />
              <Text style={[styles.errorText, { color: theme.errorText }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <Ionicons name="person-outline" size={24} color={theme.subtext} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Rakib Hossen"
                value={name}
                onChangeText={setName}
                placeholderTextColor={theme.subtext}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <Ionicons name="mail-outline" size={24} color={theme.subtext} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.subtext}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <Ionicons name="lock-closed-outline" size={24} color={theme.subtext} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor={theme.subtext}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={theme.subtext}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.subtext }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.linkText, { color: theme.primary }]}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    position: 'relative',
  },
  themeToggle: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    borderRadius: 12,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
    gap: 10,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 17,
  },
  button: {
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },
  footerText: {
    fontSize: 16,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
