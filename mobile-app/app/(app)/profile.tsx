import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../lib/auth';
import { User } from '../../types';
import Badge from '../../components/Badge';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingRow {
  icon: IconName;
  label: string;
  onPress: () => void;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    auth.getUser().then(setUser);
  }, []);

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await auth.logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  function comingSoon(feature: string) {
    Alert.alert(feature, `${feature} is coming soon!`);
  }

  function getInitials(name?: string): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  const settings: SettingRow[] = [
    { icon: 'language-outline',      label: 'Change Language',  onPress: () => comingSoon('Language settings') },
    { icon: 'notifications-outline', label: 'Notifications',    onPress: () => comingSoon('Notifications') },
    { icon: 'help-circle-outline',   label: 'Help & Support',   onPress: () => comingSoon('Help & Support') },
    { icon: 'information-circle-outline', label: 'About InvestIQ', onPress: () =>
        Alert.alert('About', 'InvestIQ v1.0.0\nAI-powered investment app for Indian college students.\n\n© 2025 InvestIQ')
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.title}>Profile</Text>

      {/* Avatar + info */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? 'User'}</Text>
        <Text style={styles.phone}>{user?.phone ?? '—'}</Text>
        <View style={styles.kycRow}>
          <Text style={styles.kycLabel}>KYC Status: </Text>
          <Badge status={user?.kycStatus ?? 'NOT_STARTED'} />
        </View>
      </View>

      {/* Account info tile */}
      <View style={styles.infoCard}>
        {user?.email ? (
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color="#94a3b8" />
            <Text style={styles.infoText}>{user.email}</Text>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
          <Text style={styles.infoText}>
            Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#94a3b8" />
          <Text style={styles.infoText}>Account ID: {user?.id?.slice(0, 8) ?? '—'}…</Text>
        </View>
      </View>

      {/* Settings rows */}
      <View style={styles.settingsCard}>
        {settings.map((row, i) => (
          <TouchableOpacity
            key={row.label}
            style={[
              styles.settingRow,
              i < settings.length - 1 && styles.settingRowBorder,
            ]}
            onPress={row.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name={row.icon} size={20} color="#94a3b8" />
              <Text style={styles.settingLabel}>{row.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#475569" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={14} color="#475569" />
        <Text style={styles.disclaimerText}>
          AI-generated content is for educational purposes only and does not constitute financial advice.
        </Text>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '800', marginBottom: 20 },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  name: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  phone: { color: '#94a3b8', fontSize: 14, marginBottom: 10 },
  kycRow: { flexDirection: 'row', alignItems: 'center' },
  kycLabel: { color: '#94a3b8', fontSize: 13 },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
    gap: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { color: '#94a3b8', fontSize: 14 },
  settingsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { color: '#f1f5f9', fontSize: 14 },
  disclaimer: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'flex-start',
  },
  disclaimerText: { color: '#475569', fontSize: 12, flex: 1, lineHeight: 18 },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#450a0a',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
});
