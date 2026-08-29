import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';

import * as Clipboard from 'expo-clipboard';

export default function ChatScreen({ route, navigation }) {
  const { topic } = route.params || { topic: 'DSA' };
  const { theme, isDark, toggleTheme } = useContext(ThemeContext);

  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const flatListRef = useRef(null);

  const handleCopyText = async (content, id) => {
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(content);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(content);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2200);
    } catch (err) {
      console.log('Copy failed:', err);
    }
  };

  useEffect(() => {
    async function startSession() {
      setError('');
      setInitLoading(true);
      try {
        const res = await api.post('/api/chat/start', { topic });
        setSessionId(res.data.session_id);
        const userName = res.data.user_name || 'User';
        const greetingMsg = {
          id: '1',
          role: 'bot',
          content: `Hello ${userName}! 👋 Welcome to your ${topic} interview practice.\nLet's get started!`,
        };
        const firstQMsg = {
          id: '2',
          role: 'bot',
          content: `Question 1:\n${res.data.question}`,
        };
        setMessages([greetingMsg, firstQMsg]);
      } catch (err) {
        setError(err.response?.data?.detail || 'Could not start interview session. Ensure server is running.');
      } finally {
        setInitLoading(false);
      }
    }
    startSession();
  }, [topic]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || loading) return;

    const userText = input.trim();
    const userMsg = { id: Date.now().toString(), role: 'user', content: userText };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/api/chat/message', {
        session_id: sessionId,
        content: userText,
      });

      const now = Date.now();
      const evalMsg = {
        id: (now + 1).toString(),
        role: 'bot',
        content: res.data.reply,
        score: res.data.score,
      };

      setMessages((prev) => {
        const nextMsgs = [...prev, evalMsg];

        if (res.data.next_question) {
          const qCount = prev.filter((m) => m.role === 'bot' && m.content.includes('Question')).length + 1;
          nextMsgs.push({
            id: (now + 2).toString(),
            role: 'bot',
            content: `Question ${qCount}:\n${res.data.next_question}`,
            score: null,
          });
        }
        return nextMsgs;
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not reach AI server. Try sending again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) {
      navigation.goBack();
      return;
    }
    setEnding(true);
    setError('');
    try {
      const res = await api.post('/api/chat/end', { session_id: sessionId });
      setSummaryData(res.data);
      setModalVisible(true);
    } catch (err) {
      // Fallback cleanly if network issue
      navigation.goBack();
    } finally {
      setEnding(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    const isCopied = copiedId === item.id;

    return (
      <View style={[styles.msgWrapper, isUser ? styles.msgWrapperUser : styles.msgWrapperBot]}>
        <View
          style={[
            styles.msgBubble,
            isUser
              ? { backgroundColor: theme.userBubble, borderBottomRightRadius: 4 }
              : { backgroundColor: theme.botBubble, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.border },
          ]}
        >
          <View style={styles.bubbleHeaderRow}>
            {!isUser && item.score != null && (
              <View style={[styles.scoreBadge, { backgroundColor: theme.scoreBg }]}>
                <Ionicons name="star" size={14} color={theme.scoreText} />
                <Text style={[styles.scoreText, { color: theme.scoreText }]}>Score: {item.score}/10</Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[
                styles.copyButton,
                { backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : theme.inputBg }
              ]}
              onPress={() => handleCopyText(item.content, item.id)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isCopied ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color={isCopied ? '#10B981' : isUser ? '#FFFFFF' : theme.subtext}
              />
              <Text
                style={[
                  styles.copyBtnText,
                  { color: isCopied ? '#10B981' : isUser ? '#FFFFFF' : theme.subtext },
                ]}
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.msgText,
              { color: isUser ? '#FFFFFF' : theme.text },
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.inputBg }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {topic} Interview
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>AI Mock Session</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.inputBg, marginRight: 8 }]}
            onPress={toggleTheme}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={isDark ? '#F59E0B' : '#4F46E5'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.endButton, { backgroundColor: theme.errorBg }]}
            onPress={handleEndSession}
            disabled={ending}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {ending ? (
              <ActivityIndicator size="small" color={theme.errorText} />
            ) : (
              <Text style={[styles.endButtonText, { color: theme.errorText }]}>End</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.errorBg }]}>
          <Ionicons name="alert-circle" size={20} color={theme.errorText} />
          <Text style={[styles.errorText, { color: theme.errorText }]}>{error}</Text>
        </View>
      ) : null}

      {/* Main Chat Body */}
      {initLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.subtext }]}>Initializing {topic} interview question...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={
              loading ? (
                <View style={styles.typingContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.typingText, { color: theme.subtext }]}>Evaluating your response...</Text>
                </View>
              ) : null
            }
          />

          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text }]}
              placeholder="Type your answer clearly..."
              placeholderTextColor={theme.subtext}
              value={input}
              onChangeText={setInput}
              multiline
              editable={!loading && !!sessionId}
              onFocus={() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 250);
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: theme.primary },
                (!input.trim() || loading || !sessionId) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!input.trim() || loading || !sessionId}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* End Session Summary Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="checkmark-circle-outline" size={56} color={theme.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Session Completed</Text>
            <Text style={[styles.modalTopic, { color: theme.subtext }]}>{topic} Interview Feedback</Text>

            {summaryData && (
              <View style={[styles.statsCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.primary }]}>
                    {summaryData.average_score != null ? `${summaryData.average_score}/10` : 'N/A'}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.subtext }]}>Average Score</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>{summaryData.total_questions}</Text>
                  <Text style={[styles.statLabel, { color: theme.subtext }]}>Questions</Text>
                </View>
              </View>
            )}

            <Text style={[styles.modalSummary, { color: theme.text }]}>
              {summaryData?.summary || 'Session finished successfully.'}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButtonPrimary, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate('MainTabs', { screen: 'HistoryMain' });
                }}
              >
                <Text style={styles.modalButtonPrimaryText}>View History</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButtonSecondary, { borderColor: theme.border }]}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate('MainTabs', { screen: 'TopicsMain' });
                }}
              >
                <Text style={[styles.modalButtonSecondaryText, { color: theme.text }]}>Back to Topics</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  endButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  endButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 14,
    padding: 14,
    borderRadius: 12,
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
    padding: 20,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '500',
  },
  chatList: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  msgWrapper: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  msgWrapperUser: {
    justifyContent: 'flex-end',
  },
  msgWrapperBot: {
    justifyContent: 'flex-start',
  },
  msgBubble: {
    maxWidth: '85%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '800',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
    gap: 4,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  msgText: {
    fontSize: 17,
    lineHeight: 25,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 15,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 17,
    maxHeight: 120,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalHeaderIcon: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalTopic: {
    fontSize: 16,
    marginTop: 4,
    marginBottom: 20,
  },
  statsCard: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#94A3B8',
    opacity: 0.3,
  },
  modalSummary: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    width: '100%',
    gap: 12,
  },
  modalButtonPrimary: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  modalButtonSecondary: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});