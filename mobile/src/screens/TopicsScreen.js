import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Header from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const TOPIC_LABELS = {
  DSA: 'Data Structures & Algorithms',
  OS: 'Operating Systems',
  DBMS: 'Database Management Systems',
  OOP: 'Object-Oriented Programming',
  CN: 'Computer Networks',
  C: 'C Programming',
  CPP: 'C++ Programming',
  JAVA: 'Java Programming',
  CA: 'Computer Architecture',
  SAD: 'System Analysis and Design',
  AI: 'Artificial Intelligence',
  CP: 'Competitive Programming (VS Code Editor)',
};

const TOPIC_ICONS = {
  DSA: 'code-slash',
  OS: 'hardware-chip-outline',
  DBMS: 'server-outline',
  OOP: 'cube-outline',
  CN: 'globe-outline',
  C: 'code-working-outline',
  CPP: 'terminal-outline',
  JAVA: 'cafe-outline',
  CA: 'cpu-outline',
  SAD: 'git-network-outline',
  AI: 'sparkles-outline',
  CP: 'terminal',
};

export default function TopicsScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);
  const { logout } = useContext(AuthContext);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchTopics = async () => {
    try {
      const res = await api.get('/api/chat/topics');
      setTopics(res.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        return;
      }
      setError(err.response?.data?.detail || 'Could not load topics. Make sure backend server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTopics();
    }, [])
  );



  const onRefresh = () => {
    setRefreshing(true);
    fetchTopics();
  };

  const handleSelectTopic = (topic, locked) => {
    if (locked) return;
    if (topic === 'CP') {
      navigation.navigate('CPEditor', { topic });
    } else {
      navigation.navigate('Chat', { topic });
    }
  };

  const renderTopicItem = ({ item }) => {
    const { topic, locked } = item;
    const label = TOPIC_LABELS[topic] || topic;
    const iconName = TOPIC_ICONS[topic] || 'document-text-outline';
    const isCP = topic === 'CP';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: isCP ? '#007ACC' : theme.border },
          locked && { backgroundColor: theme.inputBg, opacity: 0.7 },
        ]}
        onPress={() => handleSelectTopic(topic, locked)}
        activeOpacity={locked ? 1 : 0.7}
        disabled={locked}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: isCP ? '#007ACC' : locked ? theme.inputBg : theme.primaryLight },
            ]}
          >
            <Ionicons
              name={iconName}
              size={32}
              color={isCP ? '#FFFFFF' : locked ? theme.subtext : theme.primary}
            />
          </View>
          {locked ? (
            <View style={styles.proBadge}>
              <Ionicons name="lock-closed" size={16} color="#92400E" style={{ marginRight: 4 }} />
              <Text style={styles.proText}>Pro only</Text>
            </View>
          ) : isCP ? (
            <View style={[styles.proBadge, { backgroundColor: '#0284C7' }]}>
              <Ionicons name="code-slash" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={[styles.proText, { color: '#FFFFFF' }]}>VS Code Mode</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={26} color={theme.subtext} />
          )}
        </View>

        <Text style={[styles.topicTitle, { color: locked ? theme.subtext : theme.text }]}>
          {topic === 'CP' ? 'Competitive Programming' : topic}
        </Text>
        <Text style={[styles.topicDesc, { color: theme.subtext }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Topics" />

      <View style={styles.content}>
        <Text style={[styles.heading, { color: theme.text }]}>Choose a Topic</Text>
        <Text style={[styles.subheading, { color: theme.subtext }]}>
          Pick a topic to start your interactive AI mock interview.
        </Text>

        {error ? (
          <TouchableOpacity
            style={[styles.errorBanner, { backgroundColor: theme.errorBg }]}
            onPress={() => {
              if (error.toLowerCase().includes('credentials') || error.toLowerCase().includes('validate')) {
                logout();
              } else {
                fetchTopics();
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="alert-circle" size={20} color={theme.errorText} />
            <Text style={[styles.errorText, { color: theme.errorText }]}>
              {error} {error.toLowerCase().includes('credentials') ? '(Tap to re-login)' : '(Tap to retry)'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.subtext }]}>Loading interview topics...</Text>
          </View>
        ) : (
          <FlatList
            data={topics}
            keyExtractor={(item) => item.topic}
            renderItem={renderTopicItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
  },
  subheading: {
    fontSize: 17,
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 18,
    gap: 10,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 17,
  },
  listContainer: {
    paddingBottom: 28,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  proText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  topicTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  topicDesc: {
    fontSize: 16,
    marginTop: 4,
    lineHeight: 22,
  },
});
