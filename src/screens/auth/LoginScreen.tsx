import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Button, Input } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { AuthStackParamList } from '../../types';

const REMEMBER_EMAIL_KEY = 'homescout_remember_email';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

// HomeScout Logo Icon
function HomeScoutIcon({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4F46E5" />
          <Stop offset="100%" stopColor="#7C3AED" />
        </LinearGradient>
        <LinearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <Stop offset="100%" stopColor="rgba(224,231,255,0.9)" />
        </LinearGradient>
      </Defs>
      {/* House shape */}
      <Path
        d="M50 15 L82 42 L82 85 L18 85 L18 42 Z"
        fill="url(#iconGradient)"
        stroke="none"
      />
      {/* Roof accent */}
      <Path
        d="M50 15 L82 42 L76 42 L50 22 L24 42 L18 42 Z"
        fill="#6366F1"
        stroke="none"
      />
      {/* Door */}
      <Rect x="40" y="55" width="20" height="30" rx="2" fill="#E0E7FF" />
      {/* Window left */}
      <Rect x="24" y="50" width="12" height="12" rx="2" fill="#E0E7FF" />
      {/* Window right - partially behind magnifying glass */}
      <Rect x="64" y="50" width="12" height="12" rx="2" fill="#E0E7FF" />
      {/* Magnifying glass - subtly overlapping house corner */}
      <Circle cx="68" cy="38" r="14" fill="url(#glassGradient)" stroke="#4F46E5" strokeWidth="3" />
      {/* Magnifying glass inner circle (lens detail) */}
      <Circle cx="68" cy="38" r="8" fill="none" stroke="rgba(79,70,229,0.3)" strokeWidth="1.5" />
      {/* Magnifying glass handle */}
      <Path d="M78 48 L88 58" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}

// Decorative background shapes
function BackgroundDecoration() {
  return (
    <View style={styles.decorationContainer}>
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT * 0.5} style={styles.topDecoration}>
        <Defs>
          <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4F46E5" />
            <Stop offset="50%" stopColor="#6366F1" />
            <Stop offset="100%" stopColor="#8B5CF6" />
          </LinearGradient>
        </Defs>
        <Path
          d={`M0 0 L${SCREEN_WIDTH} 0 L${SCREEN_WIDTH} ${SCREEN_HEIGHT * 0.35} Q${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.45} 0 ${SCREEN_HEIGHT * 0.35} Z`}
          fill="url(#bgGradient)"
        />
        {/* Decorative circles */}
        <Circle cx={SCREEN_WIDTH * 0.85} cy={80} r={60} fill="rgba(255,255,255,0.1)" />
        <Circle cx={SCREEN_WIDTH * 0.15} cy={150} r={40} fill="rgba(255,255,255,0.08)" />
        <Circle cx={SCREEN_WIDTH * 0.7} cy={180} r={25} fill="rgba(255,255,255,0.06)" />
      </Svg>
    </View>
  );
}

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { signIn, signInWithGoogle, isLoading } = useAuthStore();

  // Load remembered email on mount
  useEffect(() => {
    const loadRememberedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem(REMEMBER_EMAIL_KEY);
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (e) {
        // Ignore errors
      }
    };
    loadRememberedEmail();
  }, []);

  const handleLogin = async () => {
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Save or clear remembered email
    try {
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch (e) {
      // Ignore errors
    }

    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <View style={styles.container}>
      <BackgroundDecoration />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header with Logo */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <HomeScoutIcon size={80} />
              </View>
              <Text style={styles.logo}>HomeScout</Text>
              <Text style={styles.tagline}>Find your perfect home together</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.welcomeSubtext}>Sign in to continue your home search</Text>

              <View style={styles.form}>
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />

                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  rightIcon={
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                      {showPassword ? (
                        <>
                          <Path
                            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                            stroke={colors.textMuted}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <Path
                            d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                            stroke={colors.textMuted}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      ) : (
                        <>
                          <Path
                            d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                            stroke={colors.textMuted}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <Path
                            d="M1 1l22 22"
                            stroke={colors.textMuted}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}
                    </Svg>
                  }
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Button
                  title="Sign In"
                  onPress={handleLogin}
                  loading={isLoading}
                  fullWidth
                  style={styles.button}
                />

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <Path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <Path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <Path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </Svg>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  decorationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: spacing.md,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tagline: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: spacing.xl,
    marginTop: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  welcomeText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  welcomeSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  form: {
    width: '100%',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  rememberText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  error: {
    color: colors.error,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
    backgroundColor: colors.error + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  button: {
    marginTop: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  googleButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  footerLink: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
