import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OrderStatus } from '../types';

type BadgeVariant = OrderStatus | 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  PENDING:     { bg: '#422006', text: '#fbbf24' },
  COMPLETE:    { bg: '#052e16', text: '#22c55e' },
  VERIFIED:    { bg: '#052e16', text: '#22c55e' },
  FAILED:      { bg: '#450a0a', text: '#ef4444' },
  REJECTED:    { bg: '#450a0a', text: '#ef4444' },
  CANCELLED:   { bg: '#1e293b', text: '#94a3b8' },
  NOT_STARTED: { bg: '#1e293b', text: '#94a3b8' },
};

interface Props {
  status: BadgeVariant;
  label?: string;
}

export default function Badge({ status, label }: Props) {
  const colors = COLOR_MAP[status] ?? { bg: '#1e293b', text: '#94a3b8' };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {label ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
