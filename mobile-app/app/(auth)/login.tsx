import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { authRequests } from '../../lib/api';
import { auth } from '../../lib/auth';

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const otpRefs = useRef<Array<TextInput | null>>([]);

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  async function handleSendOtp() {
    setError('');
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    try {
      setLoading(true);
      await authRequests.sendOtp(`+91${cleaned}`);
      setStep('otp');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── OTP digit input helpers ───────────────────────────────────────────────
  function handleOtpChange(value: string, index: number) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  async function handleVerifyOtp() {
    setError('');
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Enter the complete 6-digit OTP');
      return;
    }
    try {
      setLoading(true);
      const res = await authRequests.verifyOtp(`+91${phone.replace(/\D/g, '')}`, code);
      await auth.saveTokens({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      });
      await auth.saveUser(res.data.user);
      router.replace('/(app)/home');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setOtp(['', '', '', '', '', '']);
    setError('');
    await handleSendOtp();
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Logo */}
      <View style={styles.logoRow}>
        <Text style={styles.logoAccent}>Invest</Text>
        <Text style={styles.logoWhite}>IQ</Text>
      </View>
      <Text style={styles.tagline}>Smart investing for students</Text>

      <View style={styles.card}>
        {step === 'phone' ? (
          <>
            <Text style={styles.heading}>Enter your mobile number</Text>
            <Text style={styles.subheading}>We'll send you a one-time password</Text>

            <View style={styles.phoneRow}>
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="98765 43210"
                placeholderTextColor="#475569"
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOtp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.heading}>Verify OTP</Text>
            <Text style={styles.subheading}>
              OTP sent to +91-{phone.replace(/\D/g, '')}
            </Text>
            <Text style={styles.consoleNote}>
              (Check the auth-service server console for the OTP)
            </Text>

            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { otpRefs.current[i] = r; }}
                  style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v, i)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  returnKeyType="done"
                />
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendRow}>
              <Text style={styles.resendLabel}>Didn't receive it? </Text>
              <TouchableOpacity onPress={handleResend} disabled={loading}>
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => { setStep('phone'); setError(''); setOtp(['','','','','','']); }}
            >
              <Text style={styles.backLink}>← Change number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 24,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoAccent: {
    fontSize: 36,
    fontWeight: '800',
    color: '#6366f1',
  },
  logoWhite: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f1f5f9',
  },
  tagline: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 36,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  heading: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  subheading: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 4,
  },
  consoleNote: {
    color: '#6366f1',
    fontSize: 12,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  phoneRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 12,
    gap: 8,
  },
  prefix: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  prefixText: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    height: 48,
    color: '#f1f5f9',
    fontSize: 16,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 52,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
  },
  otpBoxFilled: {
    borderColor: '#6366f1',
  },
  error: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  resendLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  resendLink: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  backLink: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
});
