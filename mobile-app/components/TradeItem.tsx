import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Order } from '../types';
import Badge from './Badge';

interface Props {
  order: Order;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TradeItem({ order }: Props) {
  const isBuy = order.side === 'BUY';
  return (
    <View style={styles.row}>
      <View style={[styles.sideTag, { backgroundColor: isBuy ? '#052e16' : '#450a0a' }]}>
        <Text style={[styles.sideText, { color: isBuy ? '#22c55e' : '#ef4444' }]}>
          {order.side}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.symbol}>{order.symbol}</Text>
        <Text style={styles.meta}>
          {order.quantity} qty · {order.type} · {formatDate(order.createdAt)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>
          {order.executedPrice
            ? formatCurrency(order.executedPrice)
            : order.price
            ? formatCurrency(order.price)
            : 'MKT'}
        </Text>
        <Badge status={order.status} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  sideTag: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  info: {
    flex: 1,
  },
  symbol: {
    color: '#f1f5f9',
    fontWeight: '600',
    fontSize: 14,
  },
  meta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    color: '#f1f5f9',
    fontWeight: '600',
    fontSize: 13,
  },
});
