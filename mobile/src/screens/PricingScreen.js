import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Header from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';

export default function PricingScreen() {
  const { theme } = useContext(ThemeContext);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Pricing" />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.heading, { color: theme.text }]}>Choose Your Plan</Text>
        <Text style={[styles.subheading, { color: theme.subtext }]}>
          Select the plan that fits your interview prep needs.
        </Text>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.planTitle, { color: theme.text }]}>Free Tier</Text>
            <Text style={[styles.planPrice, { color: theme.text }]}>$0</Text>
          </View>

          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <Text style={[styles.featureText, { color: theme.text }]}>Access to 3 topics (DSA, OOP, CN)</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <Text style={[styles.featureText, { color: theme.text }]}>AI-evaluated answers with score & feedback</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <Text style={[styles.featureText, { color: theme.text }]}>Session history & transcripts</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="close-circle" size={22} color={theme.subtext} />
              <Text style={[styles.featureText, styles.disabledFeature, { color: theme.subtext }]}>OS & DBMS topics</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.proCard, { backgroundColor: theme.card, borderColor: theme.primary }]}>
          <View style={[styles.popularBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.popularText}>POPULAR</Text>
          </View>

          <View style={styles.cardHeader}>
            <Text style={[styles.proTitle, { color: theme.primary }]}>Pro Tier</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, { color: theme.text }]}>$9</Text>
              <Text style={[styles.periodText, { color: theme.subtext }]}>/month</Text>
            </View>
          </View>

          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>Access to all 5 topics (Including OS & DBMS)</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>AI-evaluated answers with score & feedback</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>Unlimited session history</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
              <Text style={[styles.featureText, { color: theme.text }]}>Priority AI response rate</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.proButton, { backgroundColor: theme.primaryLight }]} disabled={true} activeOpacity={0.8}>
            <Text style={[styles.proButtonText, { color: theme.primary }]}>Upgrade (Coming Soon)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  planPrice: {
    fontSize: 36,
    fontWeight: '800',
    marginTop: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  periodText: {
    fontSize: 16,
    marginLeft: 6,
  },
  featureList: {
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  disabledFeature: {
    textDecorationLine: 'line-through',
  },
  proButton: {
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  proButtonText: {
    fontSize: 17,
    fontWeight: '800',
  },
});
