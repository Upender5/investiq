import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { walletRequests } from '../../lib/api';
import { Wallet, Transaction, TransactionType } from '../../types';

function formatCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TRANSACTION_ICON: Record<TransactionType, { icon: IconName; color: string }> = {
  DEPOSIT:    { icon: 'arrow-down-circle',  color: '#22c55e' },
  WITHDRAWAL: { icon: 'arrow-up-circle',    color: '#ef4444' },
  BUY:        { icon: 'trending-up',        color: '#6366f1' },
  SELL:       { icon: 'trending-down',      color: '#f59e0b' },
  FEE:        { icon: 'receipt',            color: '#94a3b8' },
};

function TransactionRow({ tx }: { tx: Transaction }) {
  const meta = TRANSACTION_ICON[tx.type] ?? { icon: 'ellipse-outline', color: '#94a3b8' };
  const isCredit = tx.type === 'DEPOSIT' || tx.type === 'SELL';

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: meta.color + '20' }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txDesc}>{tx.description}</Text>
        <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isCredit ? '#22c55e' : '#f1f5f9' }]}>
        {isCredit ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const { data: wallet, isLoading: walletLoading } = useQuery<Wallet>({
    queryKey: ['wallet'],
    queryFn: () => walletRequests.getWallet().then((r) => r.data),
  });

  const { data: transactions, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => walletRequests.getTransactions().then((r) => r.data),
  });

  function comingSoon(action: string) {
    Alert.alert(action, `${action} is coming soon! Stay tuned.`);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceIcon}>
          <Ionicons name="wallet" size={24} color="#6366f1" />
        </View>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        {walletLoading ? (
          <ActivityIndicator color="#6366f1" />
        ) : (
          <Text style={styles.balanceValue}>
            {formatCurrency(wallet?.balance ?? 0)}
          </Text>
        )}
        <Text style={styles.currency}>{wallet?.currency ?? 'INR'}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => comingSoon('Add Money')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color="#22c55e" />
          <Text style={[styles.actionBtnText, { color: '#22c55e' }]}>Add Money</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => comingSoon('Withdraw')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up-circle-outline" size={20} color="#f59e0b" />
          <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      {/* Transactions */}
      <View style={styles.txSection}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {txLoading ? (
          <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={transactions ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TransactionRow tx={item} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={36} color="#334155" />
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '800' },
  balanceCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  balanceIcon: {
    backgroundColor: '#1e1b4b',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 6 },
  balanceValue: { color: '#f1f5f9', fontSize: 32, fontWeight: '800' },
  currency: { color: '#475569', fontSize: 12, marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnText: { fontWeight: '700', fontSize: 14 },
  txSection: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: { flex: 1 },
  txDesc: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  txDate: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: '#475569', fontSize: 14 },
});
