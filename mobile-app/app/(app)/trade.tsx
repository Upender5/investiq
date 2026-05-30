import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { tradeRequests } from '../../lib/api';
import TradeItem from '../../components/TradeItem';
import { Order, OrderSide, OrderType, PlaceOrderRequest } from '../../types';

type ActiveTab = 'place' | 'orders';

export default function TradeScreen() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('place');

  // ── Form state ────────────────────────────────────────────────────────────
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);

  const qc = useQueryClient();

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => tradeRequests.getOrders().then((r) => r.data),
  });

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: (payload: PlaceOrderRequest) =>
      tradeRequests.placeOrder(payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setConfirmVisible(false);
      setSymbol('');
      setQuantity('');
      setPrice('');
      Alert.alert('Order Placed', 'Your order has been submitted successfully.');
    },
    onError: (e: any) => {
      setConfirmVisible(false);
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to place order.');
    },
  });

  function handlePlacePress() {
    if (!symbol.trim()) { Alert.alert('Error', 'Enter a stock symbol'); return; }
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) { Alert.alert('Error', 'Enter a valid quantity'); return; }
    if (orderType === 'LIMIT' && (!price || parseFloat(price) <= 0)) {
      Alert.alert('Error', 'Enter a valid limit price');
      return;
    }
    setConfirmVisible(true);
  }

  function confirmOrder() {
    const payload: PlaceOrderRequest = {
      symbol: symbol.toUpperCase().trim(),
      side,
      type: orderType,
      quantity: parseInt(quantity, 10),
      ...(orderType === 'LIMIT' ? { price: parseFloat(price) } : {}),
    };
    placeOrder(payload);
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trade</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['place', 'orders'] as ActiveTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'place' ? 'Place Order' : 'My Orders'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'place' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            {/* Symbol */}
            <Text style={styles.label}>Stock Symbol</Text>
            <TextInput
              style={styles.input}
              value={symbol}
              onChangeText={(t) => setSymbol(t.toUpperCase())}
              placeholder="e.g. RELIANCE"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
            />

            {/* BUY / SELL */}
            <Text style={styles.label}>Order Side</Text>
            <View style={styles.segment}>
              {(['BUY', 'SELL'] as OrderSide[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.segmentBtn,
                    side === s && (s === 'BUY' ? styles.segmentBuy : styles.segmentSell),
                  ]}
                  onPress={() => setSide(s)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      side === s && styles.segmentTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* MARKET / LIMIT */}
            <Text style={styles.label}>Order Type</Text>
            <View style={styles.segment}>
              {(['MARKET', 'LIMIT'] as OrderType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.segmentBtn,
                    orderType === t && styles.segmentPrimary,
                  ]}
                  onPress={() => setOrderType(t)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      orderType === t && styles.segmentTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quantity */}
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="e.g. 10"
              placeholderTextColor="#475569"
            />

            {/* Price — only for LIMIT */}
            {orderType === 'LIMIT' && (
              <>
                <Text style={styles.label}>Limit Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 2900.00"
                  placeholderTextColor="#475569"
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.placeBtn, { backgroundColor: side === 'BUY' ? '#16a34a' : '#dc2626' }]}
              onPress={handlePlacePress}
              activeOpacity={0.8}
            >
              <Text style={styles.placeBtnText}>
                {side} {symbol || 'Stock'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* My Orders */
        ordersLoading ? (
          <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={orders ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TradeItem order={item} />}
            contentContainerStyle={styles.orderList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={36} color="#334155" />
                <Text style={styles.emptyText}>No orders placed yet</Text>
              </View>
            }
          />
        )
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setConfirmVisible(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Confirm Order</Text>

          {[
            { label: 'Symbol', value: symbol.toUpperCase() },
            { label: 'Side', value: side },
            { label: 'Type', value: orderType },
            { label: 'Quantity', value: quantity },
            ...(orderType === 'LIMIT' ? [{ label: 'Price', value: `₹${price}` }] : []),
          ].map((row) => (
            <View key={row.label} style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>{row.label}</Text>
              <Text style={styles.confirmValue}>{row.value}</Text>
            </View>
          ))}

          <View style={styles.sheetBtns}>
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnCancel]}
              onPress={() => setConfirmVisible(false)}
            >
              <Text style={styles.sheetBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sheetBtn,
                { backgroundColor: side === 'BUY' ? '#16a34a' : '#dc2626' },
                isPending && styles.buttonDisabled,
              ]}
              onPress={confirmOrder}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sheetBtnText}>Confirm {side}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '800' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#0f172a' },
  tabText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#f1f5f9' },
  form: { paddingHorizontal: 20, paddingBottom: 40 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    height: 48,
    color: '#f1f5f9',
    fontSize: 15,
  },
  segment: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  segmentBuy: { backgroundColor: '#052e16', borderColor: '#22c55e' },
  segmentSell: { backgroundColor: '#450a0a', borderColor: '#ef4444' },
  segmentPrimary: { backgroundColor: '#1e1b4b', borderColor: '#6366f1' },
  segmentText: { color: '#94a3b8', fontWeight: '600' },
  segmentTextActive: { color: '#f1f5f9' },
  placeBtn: {
    marginTop: 28,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  orderList: { paddingHorizontal: 20, paddingBottom: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: '#475569', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
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
    width: 40, height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  confirmLabel: { color: '#94a3b8', fontSize: 14 },
  confirmValue: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetBtnCancel: { backgroundColor: '#334155' },
  sheetBtnCancelText: { color: '#94a3b8', fontWeight: '600' },
  sheetBtnText: { color: '#fff', fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
});
