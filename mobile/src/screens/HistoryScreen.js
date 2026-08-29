import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import Header from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';

export default function HistoryScreen() {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/history/sessions');
      setSessions(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load session history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const viewSessionDetails = async (sessionId) => {
    setError('');
    setModalLoading(true);
    try {
      const res = await api.get(`/api/history/sessions/${sessionId}`);
      setSelectedSession(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load session transcript.');
    } finally {
      setModalLoading(false);
    }
  };

  const renderSessionItem = ({ item }) => {
    const formattedDate = new Date(item.started_at).toLocaleString();

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => viewSessionDetails(item.session_id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconBadge, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="journal-outline" size={26} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.topicName, { color: theme.text }]}>{item.topic}</Text>
            <Text style={[styles.dateText, { color: theme.subtext }]}>{formattedDate}</Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={[styles.scoreText, { color: theme.primary }]}>
            {item.average_score != null ? `Avg: ${item.average_score}/10` : 'No score'}
          </Text>
          <Text style={[styles.qCountText, { color: theme.subtext }]}>{item.question_count} question(s)</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={[styles.heading, { color: theme.text }]}>Session History</Text>
      <Text style={[styles.subheading, { color: theme.subtext }]}>
        Review your past AI interview sessions & scores.
      </Text>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.errorBg }]}>
          <Ionicons name="alert-circle" size={20} color={theme.errorText} />
          <Text style={[styles.errorText, { color: theme.errorText }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="History" />

      <View style={styles.content}>
        <FlatList
          data={loading ? [] : sessions}
          keyExtractor={(item) => item.session_id.toString()}
          renderItem={renderSessionItem}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 28 + Math.max(insets.bottom, 12) }]}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.subtext }]}>Loading history...</Text>
              </View>
            ) : sessions.length === 0 && !error ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={56} color={theme.subtext} />
                <Text style={[styles.emptyText, { color: theme.text }]}>No sessions yet.</Text>
                <Text style={[styles.emptySubtext, { color: theme.subtext }]}>Start an interview from the Topics tab!</Text>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
          }
        />
      </View>

      {/* Transcript Detail Modal */}
      <Modal
        visible={selectedSession !== null || modalLoading}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedSession(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.card }]} edges={['bottom']}>
            {modalLoading ? (
              <ActivityIndicator size="large" color={theme.primary} style={{ margin: 30 }} />
            ) : selectedSession ? (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedSession.topic} Transcript</Text>
                  <TouchableOpacity onPress={() => setSelectedSession(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color={theme.subtext} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.transcriptList}>
                  {selectedSession.messages.map((m, idx) => {
                    const isUser = m.role === 'user';
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.transcriptMsg,
                          isUser
                            ? { backgroundColor: theme.userBubble, alignSelf: 'flex-end', borderBottomRightRadius: 4 }
                            : { backgroundColor: theme.botBubble, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.border },
                        ]}
                      >
                        {m.role === 'bot' && m.score != null && (
                          <View style={[styles.modalScoreBadge, { backgroundColor: theme.scoreBg }]}>
                            <Ionicons name="star" size={14} color={theme.scoreText} />
                            <Text style={[styles.modalScoreText, { color: theme.scoreText }]}>Score: {m.score}/10</Text>
                          </View>
                        )}
                        <Text style={[styles.msgText, { color: isUser ? '#FFFFFF' : theme.text }]}>
                          {m.content}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
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
  },
  headerContainer: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 14,
  },
  emptySubtext: {
    fontSize: 16,
    marginTop: 6,
  },
  listContainer: {
    paddingBottom: 28,
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconBadge: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicName: {
    fontSize: 20,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 14,
    marginTop: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  scoreText: {
    fontSize: 17,
    fontWeight: '800',
  },
  qCountText: {
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 22,
    paddingHorizontal: 20,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  transcriptList: {
    paddingVertical: 18,
    gap: 14,
  },
  transcriptMsg: {
    padding: 14,
    borderRadius: 18,
    maxWidth: '85%',
  },
  modalScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  modalScoreText: {
    fontSize: 13,
    fontWeight: '800',
  },
  msgText: {
    fontSize: 17,
    lineHeight: 25,
  },
});
