import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: string;
  subValue?: string;
  subValueColor?: string;
}

export default function StatsCard({
  label,
  value,
  subValue,
  subValueColor = '#94a3b8',
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {subValue ? (
        <Text style={[styles.subValue, { color: subValueColor }]}>
          {subValue}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    flex: 1,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '700',
  },
  subValue: {
    fontSize: 12,
    marginTop: 2,
  },
});
