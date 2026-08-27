import React, { useState, useEffect, useContext } from 'react';
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
import ServerModal from '../components/ServerModal';
import { CLOUD_API_URL, getActiveBaseURL } from '../api/client';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [activeServerUrl, setActiveServerUrl] = useState(CLOUD_API_URL);

  const { login } = useContext(AuthContext);
  const { theme, isDark, toggleTheme } = useContext(ThemeContext);

  useEffect(() => {
    updateActiveServer();
  }, []);

  const updateActiveServer = async () => {
    const url = await getActiveBaseURL();
    setActiveServerUrl(url);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      console.error('Login error detail:', err);
      let msg = 'Login failed. Please check your credentials.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('Network Error')) {
        const currentUrl = await getActiveBaseURL();
        if (currentUrl.includes('onrender.com')) {
          msg = 'Cloud server is waking up (Render free tier take 20-30s). Please wait a moment and try again!';
        } else {
          msg = 'Cannot connect to Local PC. Check if PC is ON & backend is running, or tap below to switch to Cloud Server.';
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isCloudServer = activeServerUrl === CLOUD_API_URL;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={[styles.serverToggle, { backgroundColor: theme.inputBg }]}
            onPress={() => setServerModalVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={20} color={theme.subtext} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.themeToggle, { backgroundColor: theme.inputBg }]}
            onPress={toggleTheme}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={isDark ? '#F59E0B' : '#4F46E5'} />
          </TouchableOpacity>

          <View style={[styles.logoBadge, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="chatbubbles" size={48} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Log in to continue your AI mock interviews
          </Text>

          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.errorBg }]}>
              <Ionicons name="alert-circle" size={22} color={theme.errorText} />
              <Text style={[styles.errorText, { color: theme.errorText }]}>{error}</Text>
            </View>
          ) : null}

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
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.subtext }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.linkText, { color: theme.primary }]}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <ServerModal
        visible={serverModalVisible}
        onClose={() => setServerModalVisible(false)}
        onServerChanged={updateActiveServer}
      />
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
  serverToggle: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    borderRadius: 12,
  },
  themeToggle: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    borderRadius: 12,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 26,
    lineHeight: 24,
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
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 58,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 18,
  },
  button: {
    borderRadius: 14,
    height: 58,
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
    fontSize: 19,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 17,
  },
  linkText: {
    fontSize: 17,
    fontWeight: '800',
  },
});
