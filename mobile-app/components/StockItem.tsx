import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stock } from '../types';

interface Props {
  stock: Stock;
  onPress?: (stock: Stock) => void;
}

function formatCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StockItem({ stock, onPress }: Props) {
  const isPositive = stock.change >= 0;
  const changeColor = isPositive ? '#22c55e' : '#ef4444';
  const changePrefix = isPositive ? '+' : '';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress?.(stock)}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Text style={styles.symbol}>{stock.symbol}</Text>
        <Text style={styles.company} numberOfLines={1}>
          {stock.companyName}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.ltp}>{formatCurrency(stock.ltp)}</Text>
        <Text style={[styles.change, { color: changeColor }]}>
          {changePrefix}{stock.change.toFixed(2)} ({changePrefix}{stock.changePercent.toFixed(2)}%)
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  symbol: {
    color: '#f1f5f9',
    fontWeight: '700',
    fontSize: 14,
  },
  company: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  ltp: {
    color: '#f1f5f9',
    fontWeight: '700',
    fontSize: 15,
  },
  change: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
});
