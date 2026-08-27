import React, { useState, useEffect, useContext } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import {
  CLOUD_API_URL,
  getActiveBaseURL,
  getLocalDevURL,
  isCloudServer,
  setServerUrl,
} from '../api/client';
import axios from 'axios';

export default function ServerModal({ visible, onClose, onServerChanged }) {
  const { theme } = useContext(ThemeContext);
  const [currentUrl, setCurrentUrl] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCurrentUrl();
    }
  }, [visible]);

  const loadCurrentUrl = async () => {
    const active = await getActiveBaseURL();
    setCurrentUrl(active);
    setCustomInput(active);
  };

  const handleSelectCloud = async () => {
    await setServerUrl(CLOUD_API_URL);
    await loadCurrentUrl();
    if (onServerChanged) onServerChanged(CLOUD_API_URL);
    onClose();
  };

  const handleSelectLocal = async () => {
    Alert.alert(
      'Local PC (Ollama)',
      'For APK on your phone:\n\n1. Run START_PROJECT.bat on your PC\n2. Note your PC Wi-Fi IP (shown in the bat window)\n3. Enter it below, e.g. http://192.168.1.5:8000\n\nPhone and PC must be on the same Wi-Fi.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Template IP',
          onPress: async () => {
            const localUrl = getLocalDevURL();
            setCustomInput(localUrl);
            await setServerUrl(localUrl);
            await loadCurrentUrl();
            if (onServerChanged) onServerChanged(localUrl);
            onClose();
          },
        },
      ]
    );
  };

  const handleSaveCustom = async () => {
    if (!customInput.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid server URL');
      return;
    }
    let formatted = customInput.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'http://' + formatted;
    }
    await setServerUrl(formatted);
    await loadCurrentUrl();
    if (onServerChanged) onServerChanged(formatted);
    onClose();
  };

  const handleTestConnection = async () => {
    let testUrl = customInput.trim() || currentUrl;
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      testUrl = 'http://' + testUrl;
    }
    testUrl = testUrl.replace(/\/+$/, '');
    setTesting(true);

    try {
      const response = await axios.get(`${testUrl}/`, { timeout: 10000 });
      if (response.data && response.data.status === 'ok') {
        Alert.alert('Success', `Connected successfully to server:\n${testUrl}`);
      } else {
        Alert.alert('Connected', `Server returned response from ${testUrl}`);
      }
    } catch (err) {
      Alert.alert(
        'Connection Failed',
        `Unable to reach ${testUrl}.\n\nIf using Cloud Server, it might take 20-30 seconds to wake up (Render free tier). If using Local PC, check if PC is on the same Wi-Fi and backend is running.`
      );
    } finally {
      setTesting(false);
    }
  };

  const isCloud = isCloudServer(currentUrl);
  const isLocal = !isCloud;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="server-outline" size={24} color={theme.primary} />
              <Text style={[styles.title, { color: theme.text }]}>Server Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Cloud Server = Topics + Ask AI Chat (Gemini / Cloud AI). Local PC = Ollama LLM on your computer.
          </Text>

          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: isCloud ? theme.primaryLight : theme.inputBg, borderColor: isCloud ? theme.primary : theme.border },
            ]}
            onPress={handleSelectCloud}
            activeOpacity={0.8}
          >
            <View style={styles.optionHeader}>
              <Ionicons name="cloud-done-outline" size={24} color={theme.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>🌐 Cloud Server (Render)</Text>
                <Text style={[styles.optionUrl, { color: theme.subtext }]}>{CLOUD_API_URL}</Text>
                <Text style={[styles.optionBadge, { color: '#059669' }]}>✓ Topics + Ask AI Chat Active</Text>
              </View>
              {isCloud && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: isLocal ? theme.primaryLight : theme.inputBg, borderColor: isLocal ? theme.primary : theme.border },
            ]}
            onPress={handleSelectLocal}
            activeOpacity={0.8}
          >
            <View style={styles.optionHeader}>
              <Ionicons name="laptop-outline" size={24} color={theme.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>💻 Local PC (Ollama)</Text>
                <Text style={[styles.optionUrl, { color: theme.subtext }]}>http://YOUR_PC_IP:8000</Text>
                <Text style={[styles.optionBadge, { color: theme.subtext }]}>Best for Ask AI · same Wi-Fi required</Text>
              </View>
              {isLocal && (
                <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.customSection}>
            <Text style={[styles.label, { color: theme.text }]}>Custom Server URL:</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={customInput}
                onChangeText={setCustomInput}
                placeholder="http://192.168.1.5:8000"
                placeholderTextColor={theme.subtext}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
              onPress={handleTestConnection}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={[styles.testButtonText, { color: theme.text }]}>Test Connection</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={handleSaveCustom}
            >
              <Text style={styles.saveButtonText}>Save URL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  optionCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionUrl: {
    fontSize: 13,
    marginTop: 2,
  },
  optionBadge: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  customSection: {
    marginTop: 6,
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
