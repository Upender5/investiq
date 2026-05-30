import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { userRequests, tradeRequests } from '../../lib/api';
import { auth } from '../../lib/auth';
import StatsCard from '../../components/StatsCard';
import TradeItem from '../../components/TradeItem';
import LoadingScreen from '../../components/LoadingScreen';
import { User, Portfolio, Order } from '../../types';

function formatCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function HomeScreen() {
  const [userName, setUserName] = useState('Investor');

  useEffect(() => {
    auth.getUser().then((u) => {
      if (u?.name) setUserName(u.name.split(' ')[0]);
    });
  }, []);

  const {
    data: portfolio,
    isLoading: portfolioLoading,
    refetch: refetchPortfolio,
    isRefetching,
  } = useQuery<Portfolio>({
    queryKey: ['portfolio'],
    queryFn: () => userRequests.getPortfolio().then((r) => r.data),
  });

  const { data: orders, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => tradeRequests.getOrders().then((r) => r.data),
  });

  function handleRefresh() {
    refetchPortfolio();
    refetchOrders();
  }

  function handleAiAdvisor() {
    Alert.alert(
      'AI Advisor',
      'AI Advisor connects to the ai-advisor service (port 9001).\n\n⚠️ Disclaimer: AI responses are for educational purposes only and do not constitute financial advice.',
      [{ text: 'Understood', style: 'default' }]
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (portfolioLoading) return <LoadingScreen message="Loading portfolio..." />;

  const pnlPositive = (portfolio?.todayPnl ?? 0) >= 0;
  const returnsPositive = (portfolio?.returns ?? 0) >= 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          tintColor="#6366f1"
          colors={['#6366f1']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}, {userName} 👋</Text>
          <Text style={styles.subGreeting}>Here's your portfolio overview</Text>
        </View>
        <View style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={22} color="#94a3b8" />
        </View>
      </View>

      {/* Main portfolio card */}
      <View style={styles.portfolioCard}>
        <Text style={styles.portfolioLabel}>Total Portfolio Value</Text>
        <Text style={styles.portfolioValue}>
          {formatCurrency(portfolio?.totalValue ?? 0)}
        </Text>
        <View style={styles.pnlRow}>
          <Ionicons
            name={pnlPositive ? 'arrow-up' : 'arrow-down'}
            size={16}
            color={pnlPositive ? '#22c55e' : '#ef4444'}
          />
          <Text style={[styles.pnlText, { color: pnlPositive ? '#22c55e' : '#ef4444' }]}>
            {pnlPositive ? '+' : ''}{formatCurrency(portfolio?.todayPnl ?? 0)} today
            ({pnlPositive ? '+' : ''}{(portfolio?.todayPnlPercent ?? 0).toFixed(2)}%)
          </Text>
        </View>
      </View>

      {/* Mini stats row */}
      <View style={styles.statsRow}>
        <StatsCard
          label="Invested"
          value={formatCurrency(portfolio?.invested ?? 0)}
        />
        <StatsCard
          label="Returns"
          value={formatCurrency(portfolio?.returns ?? 0)}
          subValue={`${returnsPositive ? '+' : ''}${(portfolio?.returnsPercent ?? 0).toFixed(2)}%`}
          subValueColor={returnsPositive ? '#22c55e' : '#ef4444'}
        />
        <StatsCard
          label="Positions"
          value={String(portfolio?.positions?.length ?? 0)}
        />
      </View>

      {/* AI Advisor button */}
      <TouchableOpacity
        style={styles.aiButton}
        onPress={handleAiAdvisor}
        activeOpacity={0.8}
      >
        <Ionicons name="sparkles" size={18} color="#6366f1" />
        <Text style={styles.aiButtonText}>Ask AI Advisor</Text>
        <Ionicons name="chevron-forward" size={16} color="#6366f1" />
      </TouchableOpacity>

      {/* Recent activity */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {orders && orders.length > 0 ? (
        orders.slice(0, 3).map((order) => (
          <TradeItem key={order.id} order={order} />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="swap-horizontal-outline" size={32} color="#334155" />
          <Text style={styles.emptyText}>No trades yet. Place your first order!</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingTop: 56 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: { color: '#f1f5f9', fontSize: 20, fontWeight: '700' },
  subGreeting: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  notifBtn: {
    backgroundColor: '#1e293b',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  portfolioCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  portfolioLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 6 },
  portfolioValue: {
    color: '#f1f5f9',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  pnlRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pnlText: { fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#6366f1',
    gap: 10,
  },
  aiButtonText: {
    flex: 1,
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: { color: '#475569', fontSize: 13, textAlign: 'center' },
});
