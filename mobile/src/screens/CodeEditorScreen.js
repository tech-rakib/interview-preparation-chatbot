import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import * as Clipboard from 'expo-clipboard';

const DEFAULT_STARTER_CODE = `#include <iostream>
#include <vector>
using namespace std;

// Write your raw competitive programming solution here
int main() {
    int n;
    cout << "Ready to solve competitive programming problem" << endl;
    return 0;
}
`;

export default function CodeEditorScreen({ route, navigation }) {
  const { topic } = route.params || { topic: 'CP' };
  const { theme } = useContext(ThemeContext);

  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [code, setCode] = useState(DEFAULT_STARTER_CODE);
  const [questionCount, setQuestionCount] = useState(1);
  const [initLoading, setInitLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [score, setScore] = useState(null);
  const [copiedQuestion, setCopiedQuestion] = useState(false);
  const [copiedTerminal, setCopiedTerminal] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState('C++');
  const [showProblemDrawer, setShowProblemDrawer] = useState(true);

  const scrollViewRef = useRef(null);

  useEffect(() => {
    async function startCPSession() {
      setError('');
      setInitLoading(true);
      try {
        const res = await api.post('/api/chat/start', { topic: 'CP' });
        setSessionId(res.data.session_id);
        setCurrentQuestion(res.data.question);
        setTerminalOutput(`[VS CODE TERMINAL] Session started for Competitive Programming.\nProblem #1 Loaded. Write your solution code and click 'Run & Submit Code'.`);
      } catch (err) {
        setError(err.response?.data?.detail || 'Could not start Competitive Programming session.');
      } finally {
        setInitLoading(false);
      }
    }
    startCPSession();
  }, []);

  const handleCopyQuestion = async () => {
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(currentQuestion);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(currentQuestion);
      }
      setCopiedQuestion(true);
      setTimeout(() => setCopiedQuestion(false), 2000);
    } catch (err) {
      console.log('Copy failed:', err);
    }
  };

  const handleCopyTerminal = async () => {
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(terminalOutput);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(terminalOutput);
      }
      setCopiedTerminal(true);
      setTimeout(() => setCopiedTerminal(false), 2000);
    } catch (err) {
      console.log('Copy terminal failed:', err);
    }
  };

  const handleSubmitCode = async () => {
    if (!code.trim() || !sessionId || submitting) return;

    setSubmitting(true);
    setError('');
    const rawSubmission = code.trim();
    setTerminalOutput(`$ g++ solution.cpp -o solution && ./solution\n[COMPILING & EVALUATING CODE SOLUTION...]\n\n` + rawSubmission);

    try {
      const res = await api.post('/api/chat/message', {
        session_id: sessionId,
        content: rawSubmission,
      });

      setScore(res.data.score);
      const outputText = `[COMPILATION SUCCESSFUL]\n` +
        `----------------------------------------\n` +
        `EVALUATION SCORE: ${res.data.score != null ? res.data.score : 'N/A'}/10\n\n` +
        `FEEDBACK:\n${res.data.reply}\n` +
        `----------------------------------------\n` +
        (res.data.next_question ? `[NEXT PROBLEM LOADED BELOW]` : `[PROBLEM SET COMPLETE]`);
      
      setTerminalOutput(outputText);

      if (res.data.next_question) {
        setCurrentQuestion(res.data.next_question);
        setQuestionCount((prev) => prev + 1);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not submit code evaluation.');
      setTerminalOutput(`[ERROR] Execution failed: Unable to connect to server.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) {
      navigation.goBack();
      return;
    }
    setEnding(true);
    try {
      const res = await api.post('/api/chat/end', { session_id: sessionId });
      setSummaryData(res.data);
      setModalVisible(true);
    } catch (err) {
      navigation.goBack();
    } finally {
      setEnding(false);
    }
  };

  // Generate line numbers column
  const lineCount = Math.max(15, code.split('\n').length);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* VS Code Title Bar */}
      <View style={styles.vsCodeTitleBar}>
        <View style={styles.vsCodeLeftTitle}>
          <Ionicons name="logo-electron" size={18} color="#007ACC" style={{ marginRight: 8 }} />
          <Text style={styles.vsCodeAppTitle}>VS Code — Competitive Programming</Text>
        </View>

        <View style={styles.vsCodeHeaderActions}>
          <TouchableOpacity
            style={styles.vsCodeHeaderBtn}
            onPress={handleCopyQuestion}
            activeOpacity={0.7}
          >
            <Ionicons name={copiedQuestion ? "checkmark-circle" : "copy-outline"} size={16} color={copiedQuestion ? "#10B981" : "#CCCCCC"} />
            <Text style={[styles.vsCodeHeaderBtnText, copiedQuestion && { color: "#10B981" }]}>
              {copiedQuestion ? "Question Copied!" : "Copy Question"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.vsCodeHeaderBtn, { backgroundColor: '#DC2626' }]}
            onPress={handleEndSession}
            disabled={ending}
          >
            {ending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.vsCodeHeaderBtnText, { color: '#FFFFFF' }]}>Exit</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* VS Code Tabs Bar */}
      <View style={styles.tabsBar}>
        <TouchableOpacity style={styles.activeTab} activeOpacity={0.9}>
          <Ionicons name="code-slash" size={15} color="#007ACC" style={{ marginRight: 6 }} />
          <Text style={styles.activeTabText}>solution.cpp</Text>
          <Text style={styles.tabBadge}>CP #{questionCount}</Text>
        </TouchableOpacity>

        <View style={styles.langSelector}>
          {['C++', 'Python', 'Java'].map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.langChip, activeLanguage === lang && styles.langChipActive]}
              onPress={() => setActiveLanguage(lang)}
            >
              <Text style={[styles.langChipText, activeLanguage === lang && styles.langChipTextActive]}>{lang}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Breadcrumb Path */}
      <View style={styles.breadcrumbBar}>
        <Text style={styles.breadcrumbText}>src  &gt;  competitive_programming  &gt;  problem_{questionCount}.cpp</Text>
        
        <TouchableOpacity
          style={styles.toggleProblemBtn}
          onPress={() => setShowProblemDrawer((prev) => !prev)}
        >
          <Ionicons name={showProblemDrawer ? "chevron-up-outline" : "chevron-down-outline"} size={16} color="#007ACC" />
          <Text style={styles.toggleProblemText}>
            {showProblemDrawer ? "Hide Problem" : "Show Problem"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {initLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#007ACC" />
          <Text style={styles.loadingText}>Initializing VS Code Competitive Programming environment...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Problem Drawer / Panel */}
          {showProblemDrawer && (
            <View style={styles.problemBox}>
              <View style={styles.problemHeader}>
                <View style={styles.problemTitleRow}>
                  <Ionicons name="document-text" size={18} color="#007ACC" />
                  <Text style={styles.problemTitle}>Problem #{questionCount} Statement</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.copyBoxBtn}
                  onPress={handleCopyQuestion}
                  activeOpacity={0.7}
                >
                  <Ionicons name={copiedQuestion ? "checkmark" : "copy-outline"} size={14} color={copiedQuestion ? "#10B981" : "#9CA3AF"} />
                  <Text style={[styles.copyBoxBtnText, copiedQuestion && { color: "#10B981" }]}>
                    {copiedQuestion ? "Copied" : "Copy"}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.problemScroll} nestedScrollEnabled>
                <Text style={styles.problemText}>{currentQuestion}</Text>
              </ScrollView>
            </View>
          )}

          {/* Action Bar (Run Code / Clear Code) */}
          <View style={styles.editorActionBar}>
            <TouchableOpacity
              style={[styles.runButton, submitting && { opacity: 0.6 }]}
              onPress={handleSubmitCode}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.runButtonText}>Run &amp; Submit Code</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setCode(DEFAULT_STARTER_CODE)}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={16} color="#CCCCCC" style={{ marginRight: 4 }} />
              <Text style={styles.resetButtonText}>Reset Template</Text>
            </TouchableOpacity>
          </View>

          {/* Code Editor View (With Line Numbers) */}
          <ScrollView style={styles.editorScrollView} ref={scrollViewRef}>
            <View style={styles.editorContainer}>
              {/* Line Numbers Column */}
              <View style={styles.lineNumbersCol}>
                <Text style={styles.lineNumberText}>{lineNumbers}</Text>
              </View>

              {/* Code TextInput */}
              <TextInput
                style={styles.codeTextInput}
                value={code}
                onChangeText={setCode}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                placeholder="// Type raw competitive programming code here..."
                placeholderTextColor="#6B7280"
              />
            </View>
          </ScrollView>

          {/* VS Code Terminal Panel */}
          <View style={styles.terminalPanel}>
            <View style={styles.terminalHeader}>
              <View style={styles.terminalTitleRow}>
                <Ionicons name="terminal" size={16} color="#10B981" />
                <Text style={styles.terminalTitle}>TERMINAL / EVALUATION OUTPUT</Text>
                {score != null && (
                  <View style={styles.terminalScoreBadge}>
                    <Text style={styles.terminalScoreText}>Score: {score}/10</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.copyTerminalBtn} onPress={handleCopyTerminal}>
                <Ionicons name={copiedTerminal ? "checkmark" : "copy-outline"} size={14} color={copiedTerminal ? "#10B981" : "#9CA3AF"} />
                <Text style={[styles.copyTerminalBtnText, copiedTerminal && { color: "#10B981" }]}>
                  {copiedTerminal ? "Copied" : "Copy Output"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.terminalBody}>
              <Text style={styles.terminalText}>{terminalOutput}</Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* End Session Summary Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="trophy-outline" size={56} color="#007ACC" style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>CP Practice Completed</Text>
            <Text style={styles.modalSubtitle}>Competitive Programming Session Summary</Text>

            {summaryData && (
              <View style={styles.modalStatsCard}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>{summaryData.average_score != null ? `${summaryData.average_score}/10` : 'N/A'}</Text>
                  <Text style={styles.modalStatLabel}>Avg Score</Text>
                </View>
                <View style={styles.modalStatDivider} />
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>{summaryData.total_questions}</Text>
                  <Text style={styles.modalStatLabel}>Problems Solved</Text>
                </View>
              </View>
            )}

            <Text style={styles.modalSummaryText}>{summaryData?.summary || 'Competitive Programming practice finished.'}</Text>

            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => { setModalVisible(false); navigation.navigate('MainTabs', { screen: 'TopicsMain' }); }}>
              <Text style={styles.modalPrimaryBtnText}>Back to Topics</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  vsCodeTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#323233',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#252526',
  },
  vsCodeLeftTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vsCodeAppTitle: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '700',
  },
  vsCodeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vsCodeHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3C3C3C',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  vsCodeHeaderBtnText: {
    color: '#CCCCCC',
    fontSize: 13,
    fontWeight: '600',
  },
  tabsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
    paddingLeft: 4,
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderTopWidth: 2,
    borderTopColor: '#007ACC',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tabBadge: {
    backgroundColor: '#007ACC',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  langSelector: {
    flexDirection: 'row',
    paddingRight: 10,
    gap: 4,
  },
  langChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#333333',
  },
  langChipActive: {
    backgroundColor: '#007ACC',
  },
  langChipText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  langChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  breadcrumbText: {
    color: '#858585',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  toggleProblemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleProblemText: {
    color: '#007ACC',
    fontSize: 12,
    fontWeight: '600',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#CCCCCC',
    marginTop: 14,
    fontSize: 15,
  },
  problemBox: {
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#007ACC',
    maxHeight: 180,
    padding: 12,
  },
  problemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  problemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  problemTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  copyBoxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  copyBoxBtnText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  problemScroll: {
    backgroundColor: '#1E1E1E',
    borderRadius: 6,
    padding: 10,
  },
  problemText: {
    color: '#D4D4D4',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  editorActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252526',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  runButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3C3C3C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resetButtonText: {
    color: '#CCCCCC',
    fontSize: 13,
  },
  editorScrollView: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  editorContainer: {
    flexDirection: 'row',
    minHeight: 280,
  },
  lineNumbersCol: {
    width: 44,
    backgroundColor: '#252526',
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#2D2D2D',
  },
  lineNumberText: {
    color: '#858585',
    fontSize: 13,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'right',
  },
  codeTextInput: {
    flex: 1,
    color: '#D4D4D4',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  terminalPanel: {
    backgroundColor: '#0F172A',
    height: 170,
    borderTopWidth: 2,
    borderTopColor: '#007ACC',
    padding: 10,
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  terminalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  terminalTitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  terminalScoreBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  terminalScoreText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  copyTerminalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  copyTerminalBtnText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  terminalBody: {
    flex: 1,
  },
  terminalText: {
    color: '#38BDF8',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007ACC',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 18,
  },
  modalStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#252526',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatValue: {
    color: '#007ACC',
    fontSize: 22,
    fontWeight: '800',
  },
  modalStatLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  modalStatDivider: {
    width: 1,
    backgroundColor: '#3C3C3C',
  },
  modalSummaryText: {
    color: '#CCCCCC',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalPrimaryBtn: {
    width: '100%',
    backgroundColor: '#007ACC',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
