import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const PAYMENT_METHODS = [
  { id: 'bkash', name: 'bKash', icon: 'wallet-outline', color: '#E2136E', bg: '#FDF2F7' },
  { id: 'rocket', name: 'Rocket', icon: 'phone-portrait-outline', color: '#8C3494', bg: '#F9F0FA' },
  { id: 'nagad', name: 'Nagad', icon: 'flash-outline', color: '#F7921E', bg: '#FFF8F0' },
  { id: 'bank', name: 'Bank Transfer', icon: 'business-outline', color: '#0052CC', bg: '#EEF4FF' },
  { id: 'card', name: 'Card (Visa/MC)', icon: 'card-outline', color: '#10B981', bg: '#ECFDF5' },
];

const COURSES = [
  { id: 'full_cs', name: 'Full Access (All Topics)', price: '৳990', rawPrice: 990, desc: 'Unlocks all 11 topics including Core Engineering & AI' },
  { id: 'os_course', name: 'Operating Systems (Pro Only)', price: '৳290', rawPrice: 290, desc: 'Unlocks OS topic with CPU Scheduling & Memory mock exams' },
  { id: 'dbms_course', name: 'Database Management Systems (Pro Only)', price: '৳290', rawPrice: 290, desc: 'Unlocks DBMS topic focusing on SQL, Transactions & Indexing' },
  { id: 'ca_course', name: 'Computer Architecture (Pro Only)', price: '৳290', rawPrice: 290, desc: 'Unlocks Computer Architecture topic covering Pipelining & Registers' },
];

export default function PricingScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const { user, upgradeUserPlan } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [activeCourseId, setActiveCourseId] = useState('full_cs');
  const activeCourse = COURSES.find((c) => c.id === activeCourseId) || COURSES[0];

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('bkash');
  const [phoneOrAccount, setPhoneOrAccount] = useState('');
  const [trxId, setTrxId] = useState('');
  const [bankName, setBankName] = useState('Dutch-Bangla Bank');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const isPro = user?.plan === 'pro';

  const handleOpenGateway = () => {
    setSuccess(false);
    setProcessing(false);
    setPhoneOrAccount('01700000000');
    setTrxId('TRX' + Math.floor(10000000 + Math.random() * 90000000));
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('12/28');
    setCardCvv('123');
    setModalVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      if (route.params?.initialCourseId) {
        const courseId = route.params.initialCourseId;
        setActiveCourseId(courseId);
        
        // Open payment modal immediately
        setSuccess(false);
        setProcessing(false);
        setPhoneOrAccount('01700000000');
        setTrxId('TRX' + Math.floor(10000000 + Math.random() * 90000000));
        setCardNumber('4242 4242 4242 4242');
        setCardExpiry('12/28');
        setCardCvv('123');
        setModalVisible(true);

        // Reset parameters so it doesn't pop up again when user switches back later
        navigation.setParams({ initialCourseId: undefined });
      }
    }, [route.params?.initialCourseId])
  );

  const handleConfirmPayment = async () => {
    setProcessing(true);
    try {
      // Simulate network response delay for realistic gateway feel
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await upgradeUserPlan(selectedMethod, trxId || 'DEMO_TRX');
      setProcessing(false);
      setSuccess(true);
    } catch (err) {
      setProcessing(false);
      Alert.alert('Payment Failed', err.response?.data?.detail || 'Could not process demo payment.');
    }
  };

  const currentMethodObj = PAYMENT_METHODS.find((m) => m.id === selectedMethod) || PAYMENT_METHODS[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Pricing Plans" />

      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 36 + Math.max(insets.bottom, 12) }]} showsVerticalScrollIndicator={false}>
        {isPro && (
          <View style={[styles.activeProBanner, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}>
            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.activeProTitle, { color: '#065F46' }]}>Pro Plan Active</Text>
              <Text style={[styles.activeProSub, { color: '#047857' }]}>
                You have full unlimited access to all 11 technical interview topics!
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.heading, { color: theme.text }]}>Select Your Tier</Text>
        <Text style={[styles.subheading, { color: theme.subtext }]}>
          Unlock all 11 topics including C, C++, Java, Computer Architecture, System Analysis & AI.
        </Text>

        {/* FREE TIER CARD */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.planTitle, { color: theme.text }]}>Free Tier</Text>
              <Text style={[styles.planDesc, { color: theme.subtext }]}>Basic interview preparation</Text>
            </View>
            <Text style={[styles.planPrice, { color: theme.text }]}>৳0</Text>
          </View>

          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <Text style={[styles.featureText, { color: theme.text }]}>
                8 Free topics (DSA, OOP, CN, C, C++, Java, SAD, AI)
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <Text style={[styles.featureText, { color: theme.text }]}>AI evaluation with score & feedback</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <Text style={[styles.featureText, { color: theme.text }]}>Basic session history</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="close-circle" size={22} color={theme.subtext} />
              <Text style={[styles.featureText, styles.disabledFeature, { color: theme.subtext }]}>
                OS, DBMS & Computer Architecture (Pro Only)
              </Text>
            </View>
          </View>
        </View>

        {/* STEP 1: COURSE SELECTION */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Select Your Premium Course</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>
            Pick the specific curriculum path you want to unlock.
          </Text>
        </View>

        <View style={styles.coursesContainer}>
          {COURSES.map((course) => {
            const isSelected = activeCourseId === course.id;
            return (
              <TouchableOpacity
                key={course.id}
                style={[
                  styles.courseCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => !isPro && setActiveCourseId(course.id)}
                disabled={isPro}
              >
                <View style={styles.courseHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.courseName, { color: theme.text }]}>
                      {course.name}
                    </Text>
                    <Text style={[styles.courseDesc, { color: theme.subtext }]}>
                      {course.desc}
                    </Text>
                  </View>
                  <View style={styles.coursePriceContainer}>
                    <Text style={[styles.coursePriceText, { color: isSelected ? theme.primary : theme.text }]}>
                      {course.price}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={theme.primary}
                        style={{ marginTop: 4, alignSelf: 'flex-end' }}
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* STEP 2: PRO TIER CARD */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Select Payment Plan</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>
            Complete your upgrade payment to unlock selected content.
          </Text>
        </View>

        <View style={[styles.card, styles.proCard, { backgroundColor: theme.card, borderColor: theme.primary }]}>
          <View style={[styles.popularBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.popularText}>RECOMMENDED</Text>
          </View>

          <View style={styles.cardHeader}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.proTitle, { color: theme.primary }]}>Pro Tier Upgrade</Text>
              <Text style={[styles.planDesc, { color: theme.subtext }]}>{activeCourse.name}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, { color: theme.text }]}>{activeCourse.price}</Text>
              <Text style={[styles.periodText, { color: theme.subtext }]}>/one-time</Text>
            </View>
          </View>

          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>
                Access to all 11 topics (DSA, OS, DBMS, OOP, CN, C, C++, Java, CA, SAD, AI)
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>AI-evaluated answers with detailed scoring</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>Unlimited mock interview sessions</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>Instant high-priority AI response rate</Text>
            </View>
          </View>

          {isPro ? (
            <View style={[styles.activeButton, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.activeButtonText}>Current Active Plan</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.proButton, { backgroundColor: theme.primary }]}
              onPress={handleOpenGateway}
              activeOpacity={0.85}
            >
              <Ionicons name="card-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.proButtonText}>Upgrade to Pro (Demo Payment)</Text>
            </TouchableOpacity>
          )}

          {/* PAYMENT BADGES */}
          <View style={styles.paymentBadgesRow}>
            <Text style={[styles.paymentBadgeText, { color: theme.subtext }]}>Supported Payments:</Text>
            <View style={styles.badgesGroup}>
              <Text style={[styles.miniBadge, { color: '#E2136E', backgroundColor: '#FDF2F7' }]}>bKash</Text>
              <Text style={[styles.miniBadge, { color: '#8C3494', backgroundColor: '#F9F0FA' }]}>Rocket</Text>
              <Text style={[styles.miniBadge, { color: '#F7921E', backgroundColor: '#FFF8F0' }]}>Nagad</Text>
              <Text style={[styles.miniBadge, { color: '#0052CC', backgroundColor: '#EEF4FF' }]}>Bank</Text>
              <Text style={[styles.miniBadge, { color: '#10B981', backgroundColor: '#ECFDF5' }]}>Cards</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* DEMO PAYMENT GATEWAY MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {/* MODAL HEADER */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Demo Payment Gateway</Text>
                <Text style={[styles.modalSub, { color: theme.subtext }]}>Amount: {activeCourse.price} ({activeCourse.name})</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={26} color={theme.text} />
              </TouchableOpacity>
            </View>

            {success ? (
              /* SUCCESS STATE */
              <View style={styles.successContainer}>
                <View style={styles.successIconBox}>
                  <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                </View>
                <Text style={[styles.successTitle, { color: theme.text }]}>Payment Successful!</Text>
                <Text style={[styles.successSub, { color: theme.subtext }]}>
                  Thank you! Your account has been upgraded to Pro Tier for {activeCourse.name}. All 11 topics are now fully unlocked for practice.
                </Text>

                <TouchableOpacity
                  style={[styles.doneButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('TopicsMain');
                  }}
                >
                  <Text style={styles.doneButtonText}>Start Practicing Topics</Text>
                </TouchableOpacity>
              </View>
            ) : processing ? (
              /* PROCESSING STATE */
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={currentMethodObj.color} />
                <Text style={[styles.processingTitle, { color: theme.text }]}>
                  Processing with {currentMethodObj.name}...
                </Text>
                <Text style={[styles.processingSub, { color: theme.subtext }]}>Connecting to sandbox gateway...</Text>
              </View>
            ) : (
              /* PAYMENT SELECTION & FORM STATE */
              <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
                {/* METHOD SELECTOR */}
                <Text style={[styles.labelTitle, { color: theme.text }]}>Choose Payment Method:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodsRow}>
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = selectedMethod === method.id;
                    return (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          styles.methodTab,
                          { backgroundColor: method.bg, borderColor: isSelected ? method.color : 'transparent' },
                          isSelected && { borderWidth: 2 },
                        ]}
                        onPress={() => setSelectedMethod(method.id)}
                      >
                        <Ionicons name={method.icon} size={22} color={method.color} />
                        <Text style={[styles.methodTabText, { color: method.color }]}>{method.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* FORM FIELDS */}
                <View style={[styles.formCard, { backgroundColor: currentMethodObj.bg, borderColor: currentMethodObj.color }]}>
                  <View style={styles.formHeaderRow}>
                    <Ionicons name={currentMethodObj.icon} size={24} color={currentMethodObj.color} />
                    <Text style={[styles.formHeaderTitle, { color: currentMethodObj.color }]}>
                      {currentMethodObj.name} Payment Details
                    </Text>
                  </View>

                  {selectedMethod === 'bank' ? (
                    <>
                      <Text style={[styles.fieldLabel, { color: theme.text }]}>Select Bank Name</Text>
                      <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                        <TextInput
                          style={[styles.input, { color: theme.text }]}
                          value={bankName}
                          onChangeText={setBankName}
                          placeholder="e.g. Islami Bank, DBBL, City Bank"
                          placeholderTextColor={theme.subtext}
                        />
                      </View>

                      <Text style={[styles.fieldLabel, { color: theme.text }]}>Account / Ref Number</Text>
                      <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                        <TextInput
                          style={[styles.input, { color: theme.text }]}
                          value={phoneOrAccount}
                          onChangeText={setPhoneOrAccount}
                          keyboardType="number-pad"
                          placeholder="Account or Reference number"
                          placeholderTextColor={theme.subtext}
                        />
                      </View>
                    </>
                  ) : selectedMethod === 'card' ? (
                    <>
                      <Text style={[styles.fieldLabel, { color: theme.text }]}>Card Number</Text>
                      <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                        <TextInput
                          style={[styles.input, { color: theme.text }]}
                          value={cardNumber}
                          onChangeText={setCardNumber}
                          keyboardType="number-pad"
                          placeholder="4242 4242 4242 4242"
                          placeholderTextColor={theme.subtext}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldLabel, { color: theme.text }]}>Expiry</Text>
                          <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                            <TextInput
                              style={[styles.input, { color: theme.text }]}
                              value={cardExpiry}
                              onChangeText={setCardExpiry}
                              placeholder="MM/YY"
                              placeholderTextColor={theme.subtext}
                            />
                          </View>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldLabel, { color: theme.text }]}>CVV</Text>
                          <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                            <TextInput
                              style={[styles.input, { color: theme.text }]}
                              value={cardCvv}
                              onChangeText={setCardCvv}
                              secureTextEntry={true}
                              placeholder="123"
                              placeholderTextColor={theme.subtext}
                            />
                          </View>
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.fieldLabel, { color: theme.text }]}>
                        {currentMethodObj.name} Account / Mobile Number
                      </Text>
                      <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                        <TextInput
                          style={[styles.input, { color: theme.text }]}
                          value={phoneOrAccount}
                          onChangeText={setPhoneOrAccount}
                          keyboardType="phone-pad"
                          placeholder="e.g. 01700000000"
                          placeholderTextColor={theme.subtext}
                        />
                      </View>

                      <Text style={[styles.fieldLabel, { color: theme.text }]}>Transaction ID (TrxID)</Text>
                      <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                        <TextInput
                          style={[styles.input, { color: theme.text }]}
                          value={trxId}
                          onChangeText={setTrxId}
                          placeholder="e.g. TRX9847291"
                          placeholderTextColor={theme.subtext}
                        />
                      </View>
                    </>
                  )}

                  <View style={styles.demoTipBox}>
                    <Ionicons name="information-circle-outline" size={18} color={currentMethodObj.color} />
                    <Text style={[styles.demoTipText, { color: currentMethodObj.color }]}>
                      Demo Mode: You can leave pre-filled dummy details or type your own test transaction!
                    </Text>
                  </View>
                </View>

                {/* PAY BUTTON */}
                <TouchableOpacity
                  style={[styles.paySubmitButton, { backgroundColor: currentMethodObj.color }]}
                  onPress={handleConfirmPayment}
                  activeOpacity={0.85}
                >
                  <Text style={styles.paySubmitButtonText}>Confirm Payment of ৳990</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  scrollContainer: {
    padding: 18,
    paddingBottom: 36,
    gap: 18,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
  },
  subheading: {
    fontSize: 16,
    marginTop: -8,
    marginBottom: 4,
    lineHeight: 22,
  },
  activeProBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 14,
  },
  activeProTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  activeProSub: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  proCard: {
    borderWidth: 2,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -14,
    right: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  proTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  planDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 34,
    fontWeight: '800',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  periodText: {
    fontSize: 15,
    marginLeft: 4,
  },
  featureList: {
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  disabledFeature: {
    textDecorationLine: 'line-through',
  },
  proButton: {
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  proButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activeButton: {
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  activeButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#10B981',
  },
  paymentBadgesRow: {
    marginTop: 20,
    gap: 8,
  },
  paymentBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgesGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '800',
  },
  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 14,
    marginTop: 2,
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  labelTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  methodsRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  methodTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    gap: 8,
  },
  methodTabText: {
    fontSize: 14,
    fontWeight: '800',
  },
  formCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  formHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  inputBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    fontWeight: '600',
  },
  demoTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  demoTipText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  paySubmitButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  paySubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  processingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  processingSub: {
    fontSize: 15,
    textAlign: 'center',
  },
  successContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconBox: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  doneButton: {
    height: 54,
    paddingHorizontal: 28,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  coursesContainer: {
    gap: 12,
    marginBottom: 20,
  },
  courseCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '700',
  },
  courseDesc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  coursePriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 70,
  },
  coursePriceText: {
    fontSize: 18,
    fontWeight: '800',
  },
});
