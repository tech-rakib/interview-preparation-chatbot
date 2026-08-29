import React, { useEffect, useRef, useState, useContext, useCallback } from 'react';
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
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api, { CLOUD_API_URL, getActiveBaseURL, isCloudServer } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import * as Clipboard from 'expo-clipboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

export default function AskAIScreen() {
  const { theme, isDark, toggleTheme } = useContext(ThemeContext);

  // Conversation list
  const [conversations, setConversations] = useState([]);
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [loadingConvos, setLoadingConvos] = useState(false);

  // Messages
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  // Delete confirmation
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Copy
  const [copiedId, setCopiedId] = useState(null);

  // AI provider status
  const [aiStatus, setAiStatus] = useState(null);
  const [serverUrl, setServerUrl] = useState(CLOUD_API_URL);

  const flatListRef = useRef(null);

  const loadServerInfo = async () => {
    const active = await getActiveBaseURL();
    setServerUrl(active);
  };

  const fetchAiStatus = async () => {
    try {
      const res = await api.get('/api/ask-ai/status');
      setAiStatus(res.data);
    } catch (err) {
      setAiStatus(null);
    }
  };

  // ── Fetch conversation list ──
  const fetchConversations = async () => {
    setLoadingConvos(true);
    try {
      const res = await api.get('/api/ask-ai/conversations');
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConvos(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadServerInfo();
      fetchConversations();
      fetchAiStatus();
    }, [])
  );

  // ── Fetch messages for a conversation ──
  const fetchMessages = async (convoId) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/api/ask-ai/conversations/${convoId}/messages`);
      setMessages(
        res.data.map((m) => ({
          id: m.id.toString(),
          role: m.role,
          content: m.content,
        }))
      );
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // ── Select a conversation ──
  const handleSelectConvo = (convoId) => {
    setActiveConvoId(convoId);
    fetchMessages(convoId);
    closeDrawer();
  };

  // ── New conversation ──
  const handleNewChat = async () => {
    try {
      const res = await api.post('/api/ask-ai/conversations');
      const newConvo = res.data;
      setConversations((prev) => [newConvo, ...prev]);
      setActiveConvoId(newConvo.id);
      setMessages([]);
      closeDrawer();
    } catch (err) {
      console.error('Failed to create conversation:', err);
      Alert.alert(
        'Connection Error',
        'Could not connect to the server. Please make sure the backend is running.',
        [{ text: 'OK' }]
      );
    }
  };

  // ── Delete conversation ──
  const handleDeleteConvo = async () => {
    if (!deleteTargetId) return;
    try {
      await api.delete(`/api/ask-ai/conversations/${deleteTargetId}`);
      setConversations((prev) => prev.filter((c) => c.id !== deleteTargetId));
      if (activeConvoId === deleteTargetId) {
        setActiveConvoId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    } finally {
      setDeleteModalVisible(false);
      setDeleteTargetId(null);
    }
  };

  // ── Send message ──
  const handleSend = async () => {
    if (!input.trim() || sending) return;

    let convoId = activeConvoId;

    // Auto-create conversation if none selected
    if (!convoId) {
      try {
        const res = await api.post('/api/ask-ai/conversations');
        const newConvo = res.data;
        setConversations((prev) => [newConvo, ...prev]);
        convoId = newConvo.id;
        setActiveConvoId(convoId);
      } catch (err) {
        console.error('Failed to create conversation:', err);
        return;
      }
    }

    const userText = input.trim();
    const userMsg = { id: Date.now().toString(), role: 'user', content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await api.post(
        '/api/ask-ai/ask',
        {
          conversation_id: convoId,
          content: userText,
        },
        { timeout: 120000 }
      );

      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: res.data.reply,
      };
      setMessages((prev) => [...prev, botMsg]);

      // Update conversation title in sidebar
      if (res.data.conversation_title) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convoId ? { ...c, title: res.data.conversation_title } : c
          )
        );
      }

      if (res.data.provider) {
        setAiStatus((prev) => ({
          ...(prev || {}),
          active_provider: res.data.provider,
        }));
      }
    } catch (err) {
      const statusCode = err?.response?.status;
      let errorContent = 'Sorry, could not reach the AI server.';
      if (statusCode === 404) {
        errorContent =
          'Ask AI is not available on this server yet. Open Login → Server Settings → select "Local PC" and run START_PROJECT.bat on your computer (with Ollama running).';
      } else if (statusCode === 401) {
        errorContent = 'Session expired. Please log in again.';
      } else if (!err?.response) {
        errorContent = 'Cannot connect to server. Please check your internet connection or make sure the backend is running.';
      }
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: errorContent,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  // ── Copy ──
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

  // ── Drawer animations ──
  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  };

  // ── Get active conversation title ──
  const activeTitle = conversations.find((c) => c.id === activeConvoId)?.title || 'Ask AI';

  // ── Render message bubble ──
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
              : {
                  backgroundColor: theme.botBubble,
                  borderBottomLeftRadius: 4,
                  borderWidth: 1,
                  borderColor: theme.border,
                },
          ]}
        >
          <View style={styles.bubbleHeaderRow}>
            <View style={styles.roleTag}>
              <Ionicons
                name={isUser ? 'person' : 'sparkles'}
                size={12}
                color={isUser ? '#FFFFFF' : theme.primary}
              />
              <Text
                style={[
                  styles.roleText,
                  { color: isUser ? 'rgba(255,255,255,0.8)' : theme.subtext },
                ]}
              >
                {isUser ? 'You' : 'AI'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.copyButton,
                { backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : theme.inputBg },
              ]}
              onPress={() => handleCopyText(item.content, item.id)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isCopied ? 'checkmark-circle' : 'copy-outline'}
                size={14}
                color={isCopied ? '#10B981' : isUser ? '#FFFFFF' : theme.subtext}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.msgText, { color: isUser ? '#FFFFFF' : theme.text }]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const getProviderLabel = () => {
    const provider = aiStatus?.active_provider;
    if (provider === 'gemini') return `✨ Gemini · ${aiStatus?.model || '2.0-flash'}`;
    if (provider === 'ollama') return `💻 Ollama · ${aiStatus?.model || 'local'}`;
    if (provider === 'cloud-ai') return `🌐 Cloud AI · ChatGPT`;
    if (isCloudServer(serverUrl)) return '🌐 Cloud AI Active';
    return '💻 Local PC (run START_PROJECT.bat)';
  };

  const getEmptySubtitle = () => {
    if (aiStatus?.active_provider === 'ollama') {
      return 'Ask anything about programming, CS topics, or interview prep. Ollama is running on your PC.';
    }
    if (aiStatus?.active_provider === 'gemini') {
      return 'Ask anything — powered by Gemini Cloud AI. Ready to assist you anytime!';
    }
    return 'Ask anything about programming, CS concepts, interview prep, or general code questions!';
  };

  // ── Empty state ──
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.primaryLight }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={48} color={theme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>Ask AI Anything</Text>
      <Text style={[styles.emptySubtitle, { color: theme.subtext }]}>
        {getEmptySubtitle()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.inputBg }]}
          onPress={openDrawer}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="menu" size={22} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {activeTitle}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
            {getProviderLabel()}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.inputBg, marginRight: 8 }]}
            onPress={toggleTheme}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={isDark ? '#F59E0B' : '#4F46E5'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.newChatBtn, { backgroundColor: theme.primary }]}
            onPress={handleNewChat}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main chat area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loadingMessages ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.subtext }]}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={
              sending ? (
                <View style={styles.typingContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.typingText, { color: theme.subtext }]}>AI is thinking...</Text>
                </View>
              ) : null
            }
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="Ask anything..."
            placeholderTextColor={theme.subtext}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!sending}
            onSubmitEditing={handleSend}
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
              (!input.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Drawer overlay ── */}
      {drawerOpen && (
        <TouchableOpacity
          style={[styles.drawerOverlay, { backgroundColor: theme.modalOverlay }]}
          activeOpacity={1}
          onPress={closeDrawer}
        />
      )}

      {/* ── Conversation drawer ── */}
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: theme.card,
            borderRightColor: theme.border,
            transform: [{ translateX: drawerAnim }],
          },
        ]}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={styles.drawerHeader}>
            <Text style={[styles.drawerTitle, { color: theme.text }]}>Chat History</Text>
            <TouchableOpacity onPress={closeDrawer} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.newChatDrawerBtn, { backgroundColor: theme.primaryLight }]}
            onPress={handleNewChat}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
            <Text style={[styles.newChatDrawerText, { color: theme.primary }]}>New Chat</Text>
          </TouchableOpacity>

          {loadingConvos ? (
            <View style={styles.drawerCenter}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.drawerCenter}>
              <Text style={[styles.drawerEmptyText, { color: theme.subtext }]}>No conversations yet</Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.convoItem,
                    {
                      backgroundColor: item.id === activeConvoId ? theme.primaryLight : 'transparent',
                      borderBottomColor: theme.border,
                    },
                  ]}
                  onPress={() => handleSelectConvo(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color={item.id === activeConvoId ? theme.primary : theme.subtext}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={[
                      styles.convoTitle,
                      {
                        color: item.id === activeConvoId ? theme.primary : theme.text,
                        fontWeight: item.id === activeConvoId ? '700' : '500',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setDeleteTargetId(item.id);
                      setDeleteModalVisible(true);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.deleteConvoBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.subtext} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Animated.View>

      {/* ── Delete confirmation modal ── */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Ionicons name="warning-outline" size={40} color={theme.errorText} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Delete Chat?</Text>
            <Text style={[styles.modalSubtitle, { color: theme.subtext }]}>
              This conversation and all its messages will be permanently deleted.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { borderColor: theme.border }]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteTargetId(null);
                }}
              >
                <Text style={[styles.modalBtnCancelText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnDelete, { backgroundColor: theme.errorText }]}
                onPress={handleDeleteConvo}
              >
                <Text style={styles.modalBtnDeleteText}>Delete</Text>
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
  // ── Header ──
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
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Empty state ──
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  // ── Chat list ──
  chatList: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
  },
  msgWrapper: {
    flexDirection: 'row',
    marginVertical: 3,
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
    marginBottom: 6,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  copyButton: {
    padding: 4,
    borderRadius: 6,
  },
  msgText: {
    fontSize: 16,
    lineHeight: 24,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  // ── Input ──
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
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // ── Drawer ──
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    borderRightWidth: 1,
    zIndex: 100,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  newChatDrawerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 10,
  },
  newChatDrawerText: {
    fontSize: 15,
    fontWeight: '700',
  },
  drawerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerEmptyText: {
    fontSize: 15,
  },
  convoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  convoTitle: {
    flex: 1,
    fontSize: 15,
  },
  deleteConvoBtn: {
    padding: 4,
    marginLeft: 8,
  },
  // ── Delete Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBtnDelete: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnDeleteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
