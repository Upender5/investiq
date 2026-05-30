import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { marketRequests } from '../../lib/api';
import StockItem from '../../components/StockItem';
import { Stock } from '../../types';

function formatCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export default function MarketsScreen() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Stock | null>(null);

  const { data: stocks, isLoading } = useQuery<Stock[]>({
    queryKey: ['top-stocks'],
    queryFn: () => marketRequests.getTopStocks().then((r) => r.data),
    // Fallback mock data so the screen renders without a live backend
    placeholderData: MOCK_STOCKS,
  });

  const filtered = useMemo(() => {
    if (!stocks) return [];
    if (!search.trim()) return stocks;
    const q = search.toLowerCase();
    return stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q)
    );
  }, [stocks, search]);

  const isPositive = (selected?.change ?? 0) >= 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Markets</Text>
        <Text style={styles.exchange}>NSE</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#475569" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search stocks..."
          placeholderTextColor="#475569"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#475569" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Top Stocks</Text>
          {filtered.map((stock) => (
            <StockItem key={stock.symbol} stock={stock} onPress={setSelected} />
          ))}
          {filtered.length === 0 && (
            <Text style={styles.noResults}>No stocks found for "{search}"</Text>
          )}
        </ScrollView>
      )}

      {/* Detail Modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSelected(null)}
        />
        {selected && (
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetSymbol}>{selected.symbol}</Text>
                <Text style={styles.sheetCompany}>{selected.companyName}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetLtp}>{formatCurrency(selected.ltp)}</Text>
            <View style={styles.sheetChangeRow}>
              <Ionicons
                name={isPositive ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={isPositive ? '#22c55e' : '#ef4444'}
              />
              <Text style={{ color: isPositive ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
                {isPositive ? '+' : ''}{selected.change.toFixed(2)} ({isPositive ? '+' : ''}{selected.changePercent.toFixed(2)}%)
              </Text>
            </View>

            <View style={styles.statsGrid}>
              {[
                { label: 'Open', value: formatCurrency(selected.open) },
                { label: 'High', value: formatCurrency(selected.high) },
                { label: 'Low', value: formatCurrency(selected.low) },
                { label: 'Volume', value: formatVolume(selected.volume) },
              ].map((stat) => (
                <View key={stat.label} style={styles.statCell}>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

// ── Mock data (displayed when backend is offline) ─────────────────────────────
const MOCK_STOCKS: Stock[] = [
  { symbol: 'RELIANCE', companyName: 'Reliance Industries', ltp: 2943.5, change: 23.4, changePercent: 0.8, open: 2920, high: 2960, low: 2910, volume: 4_200_000, exchange: 'NSE' },
  { symbol: 'TCS', companyName: 'Tata Consultancy Services', ltp: 4012.0, change: -18.5, changePercent: -0.46, open: 4030, high: 4050, low: 3995, volume: 1_100_000, exchange: 'NSE' },
  { symbol: 'INFY', companyName: 'Infosys Ltd.', ltp: 1876.2, change: 12.8, changePercent: 0.69, open: 1863, high: 1890, low: 1860, volume: 2_300_000, exchange: 'NSE' },
  { symbol: 'HDFCBANK', companyName: 'HDFC Bank Ltd.', ltp: 1703.45, change: -5.3, changePercent: -0.31, open: 1710, high: 1720, low: 1698, volume: 3_500_000, exchange: 'NSE' },
  { symbol: 'ICICIBANK', companyName: 'ICICI Bank Ltd.', ltp: 1245.6, change: 8.9, changePercent: 0.72, open: 1236, high: 1252, low: 1232, volume: 2_800_000, exchange: 'NSE' },
  { symbol: 'WIPRO', companyName: 'Wipro Ltd.', ltp: 487.3, change: 3.1, changePercent: 0.64, open: 484, high: 492, low: 482, volume: 1_600_000, exchange: 'NSE' },
  { symbol: 'BAJFINANCE', companyName: 'Bajaj Finance Ltd.', ltp: 7285.0, change: -42.0, changePercent: -0.57, open: 7327, high: 7340, low: 7260, volume: 500_000, exchange: 'NSE' },
  { symbol: 'SBIN', companyName: 'State Bank of India', ltp: 843.2, change: 6.75, changePercent: 0.81, open: 836, high: 848, low: 834, volume: 5_000_000, exchange: 'NSE' },
  { symbol: 'TATAMOTORS', companyName: 'Tata Motors Ltd.', ltp: 1025.5, change: 15.2, changePercent: 1.51, open: 1010, high: 1032, low: 1007, volume: 3_100_000, exchange: 'NSE' },
  { symbol: 'HINDUNILVR', companyName: 'Hindustan Unilever Ltd.', ltp: 2548.75, change: -9.25, changePercent: -0.36, open: 2558, high: 2562, low: 2540, volume: 700_000, exchange: 'NSE' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '800' },
  exchange: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  searchInput: { flex: 1, color: '#f1f5f9', fontSize: 15 },
  list: { flex: 1, paddingHorizontal: 20 },
  sectionLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  noResults: { color: '#475569', textAlign: 'center', marginTop: 32 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetSymbol: { color: '#f1f5f9', fontSize: 20, fontWeight: '800' },
  sheetCompany: { color: '#94a3b8', fontSize: 13 },
  sheetLtp: { color: '#f1f5f9', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  sheetChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCell: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    width: '47%',
  },
  statLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  statValue: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
});
