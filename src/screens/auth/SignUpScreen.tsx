import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, fontSize, fontWeight } from '../../constants/theme';
import { AuthStackParamList, UserType } from '../../types';
import { borderRadius } from '../../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;
};

export function SignUpScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'userType' | 'signup' | 'household'>('userType');
  const [userType, setUserType] = useState<UserType>('individual');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState('');

  const { signUp, createHousehold, joinHousehold, isLoading } = useAuthStore();

  const handleSignUp = async () => {
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    console.log('Attempting signup with:', email, 'as', userType);
    const result = await signUp(email, password, name, userType);
    console.log('Signup result:', result);
    if (result.error) {
      console.log('Signup error:', result.error);
      setError(result.error);
    } else {
      console.log('Signup success, moving to household step');
      setStep('household');
    }
  };

  const handleCreateHousehold = async () => {
    setError('');

    if (!householdName) {
      setError('Please enter a household name');
      return;
    }

    const result = await createHousehold(householdName);
    if (result.error) {
      setError(result.error);
    } else if (result.inviteCode) {
      setCreatedInviteCode(result.inviteCode);
    }
  };

  const handleJoinHousehold = async () => {
    setError('');

    if (!inviteCode) {
      setError('Please enter an invite code');
      return;
    }

    const result = await joinHousehold(inviteCode);
    if (result.error) {
      setError(result.error);
    }
  };

  // User Type Selection Step
  if (step === 'userType') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to HomeScout</Text>
            <Text style={styles.subtitle}>How will you be using the app?</Text>
          </View>

          <View style={styles.userTypeContainer}>
            <TouchableOpacity
              style={[
                styles.userTypeCard,
                userType === 'individual' && styles.userTypeCardActive,
              ]}
              onPress={() => setUserType('individual')}
            >
              <Text style={styles.userTypeIcon}>🏠</Text>
              <Text style={[
                styles.userTypeTitle,
                userType === 'individual' && styles.userTypeTitleActive,
              ]}>Home Buyer</Text>
              <Text style={styles.userTypeDescription}>
                I'm searching for a home for myself or my family
              </Text>
              {userType === 'individual' && (
                <View style={styles.userTypeCheck}>
                  <Text style={styles.userTypeCheckText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.userTypeCard,
                userType === 'broker' && styles.userTypeCardActive,
              ]}
              onPress={() => setUserType('broker')}
            >
              <Text style={styles.userTypeIcon}>💼</Text>
              <Text style={[
                styles.userTypeTitle,
                userType === 'broker' && styles.userTypeTitleActive,
              ]}>Real Estate Professional</Text>
              <Text style={styles.userTypeDescription}>
                I'm a broker or agent managing properties for clients
              </Text>
              {userType === 'broker' && (
                <View style={styles.userTypeCheck}>
                  <Text style={styles.userTypeCheckText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.userTypeFeatures}>
            <Text style={styles.userTypeFeaturesTitle}>
              {userType === 'individual' ? 'Perfect for:' : 'Includes features for:'}
            </Text>
            {userType === 'individual' ? (
              <>
                <Text style={styles.userTypeFeature}>• Track properties you're interested in</Text>
                <Text style={styles.userTypeFeature}>• Compare homes side by side</Text>
                <Text style={styles.userTypeFeature}>• Calculate mortgage costs</Text>
                <Text style={styles.userTypeFeature}>• Share with your partner/family</Text>
              </>
            ) : (
              <>
                <Text style={styles.userTypeFeature}>• Manage client portfolios</Text>
                <Text style={styles.userTypeFeature}>• Schedule and track showings</Text>
                <Text style={styles.userTypeFeature}>• Dashboard with analytics</Text>
                <Text style={styles.userTypeFeature}>• Activity tracking per property</Text>
              </>
            )}
          </View>

          <Button
            title="Continue"
            onPress={() => setStep('signup')}
            fullWidth
            style={styles.continueButton}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'household') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>Set Up Your Household</Text>
              <Text style={styles.subtitle}>
                Create a new household or join your partner's
              </Text>
            </View>

            {createdInviteCode ? (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>Household Created!</Text>
                <Text style={styles.successText}>
                  Share this code with your partner:
                </Text>
                <Text style={styles.inviteCode}>{createdInviteCode}</Text>
                <Text style={styles.successNote}>
                  They can use this code to join your household.
                </Text>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Create New Household</Text>
                  <Input
                    label="Household Name"
                    placeholder="e.g., The Smiths"
                    value={householdName}
                    onChangeText={setHouseholdName}
                  />
                  <Button
                    title="Create Household"
                    onPress={handleCreateHousehold}
                    loading={isLoading}
                    fullWidth
                  />
                </View>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Join Existing Household</Text>
                  <Input
                    label="Invite Code"
                    placeholder="Enter code from your partner"
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="none"
                  />
                  <Button
                    title="Join Household"
                    onPress={handleJoinHousehold}
                    variant="outline"
                    loading={isLoading}
                    fullWidth
                  />
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your home search journey</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Name"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />

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
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={isLoading}
              fullWidth
              style={styles.button}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    width: '100%',
  },
  error: {
    color: colors.error,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  footerLink: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
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
  successBox: {
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  inviteCode: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginVertical: spacing.md,
    letterSpacing: 4,
  },
  successNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // User Type Selection Styles
  userTypeContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  userTypeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  userTypeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  userTypeIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  userTypeTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  userTypeTitleActive: {
    color: colors.primary,
  },
  userTypeDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  userTypeCheck: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTypeCheckText: {
    color: colors.textInverse,
    fontWeight: fontWeight.bold,
    fontSize: 14,
  },
  userTypeFeatures: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  userTypeFeaturesTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  userTypeFeature: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  continueButton: {
    marginBottom: spacing.md,
  },
});
