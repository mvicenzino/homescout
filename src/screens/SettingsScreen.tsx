import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Input } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { usePropertyStore } from '../store/propertyStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { resetOnboarding } from './auth/OnboardingScreen';

export function SettingsScreen() {
  const { user, household, signOut, updateProfile } = useAuthStore();
  const {
    calculatorDefaults,
    setCalculatorDefaults,
    hasAnthropicKey,
    checkAnthropicKey,
    saveAnthropicKey,
    clearAnthropicKey,
    financialProfile,
    setFinancialProfile,
  } = useSettingsStore();
  const { properties } = usePropertyStore();

  const [name, setName] = useState(user?.name || '');
  const [interestRate, setInterestRate] = useState(calculatorDefaults.interestRate.toString());
  const [downPayment, setDownPayment] = useState(calculatorDefaults.downPaymentPercent.toString());
  const [loanTerm, setLoanTerm] = useState(calculatorDefaults.loanTermYears.toString());
  const [propertyTaxRate, setPropertyTaxRate] = useState(
    calculatorDefaults.propertyTaxRate.toString()
  );
  const [insuranceRate, setInsuranceRate] = useState(calculatorDefaults.insuranceRate.toString());
  const [anthropicKey, setAnthropicKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Financial profile state
  const [annualIncome, setAnnualIncome] = useState(
    financialProfile.annual_household_income?.toString() || ''
  );
  const [monthlyDebts, setMonthlyDebts] = useState(
    financialProfile.monthly_debt_payments?.toString() || ''
  );
  const [downPaymentAvailable, setDownPaymentAvailable] = useState(
    financialProfile.available_down_payment?.toString() || ''
  );
  const [totalSavings, setTotalSavings] = useState(
    financialProfile.total_savings?.toString() || ''
  );
  const [creditScore, setCreditScore] = useState(
    financialProfile.credit_score_range || ''
  );
  const [targetPayment, setTargetPayment] = useState(
    financialProfile.target_monthly_payment?.toString() || ''
  );
  const [investmentHorizon, setInvestmentHorizon] = useState(
    financialProfile.investment_horizon_years?.toString() || ''
  );
  const [firstTimeBuyer, setFirstTimeBuyer] = useState(
    financialProfile.first_time_buyer ?? false
  );
  const [financialSaved, setFinancialSaved] = useState(false);

  // Check if financial profile has any data
  const hasFinancialData = Boolean(
    financialProfile.annual_household_income ||
    financialProfile.available_down_payment ||
    financialProfile.target_monthly_payment
  );

  useEffect(() => {
    checkAnthropicKey();
  }, []);

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    const result = await updateProfile({ name: name.trim() });
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      Alert.alert('Success', 'Profile updated');
    }
  };

  const handleSaveDefaults = () => {
    setCalculatorDefaults({
      interestRate: parseFloat(interestRate) || 6.5,
      downPaymentPercent: parseFloat(downPayment) || 20,
      loanTermYears: parseInt(loanTerm) || 30,
      propertyTaxRate: parseFloat(propertyTaxRate) || 1.2,
      insuranceRate: parseFloat(insuranceRate) || 0.35,
    });
    Alert.alert('Success', 'Calculator defaults saved');
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  const handleSaveAnthropicKey = async () => {
    if (!anthropicKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    if (!anthropicKey.startsWith('sk-ant-')) {
      Alert.alert('Error', 'Invalid API key format. Anthropic keys start with "sk-ant-"');
      return;
    }

    setIsSavingKey(true);
    const result = await saveAnthropicKey(anthropicKey.trim());
    setIsSavingKey(false);

    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      setAnthropicKey('');
      Alert.alert('Success', 'Claude API key saved securely');
    }
  };

  const handleClearAnthropicKey = () => {
    Alert.alert(
      'Remove API Key',
      'Are you sure you want to remove your Claude API key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await clearAnthropicKey();
            Alert.alert('Success', 'API key removed');
          },
        },
      ]
    );
  };

  const handleSaveFinancialProfile = () => {
    setFinancialProfile({
      annual_household_income: annualIncome ? parseFloat(annualIncome) : undefined,
      monthly_debt_payments: monthlyDebts ? parseFloat(monthlyDebts) : undefined,
      available_down_payment: downPaymentAvailable ? parseFloat(downPaymentAvailable) : undefined,
      total_savings: totalSavings ? parseFloat(totalSavings) : undefined,
      credit_score_range: creditScore as 'excellent' | 'good' | 'fair' | 'poor' || undefined,
      target_monthly_payment: targetPayment ? parseFloat(targetPayment) : undefined,
      investment_horizon_years: investmentHorizon ? parseInt(investmentHorizon) : undefined,
      first_time_buyer: firstTimeBuyer,
    });
    setFinancialSaved(true);
    setTimeout(() => setFinancialSaved(false), 3000);
    Alert.alert(
      'Financial Profile Saved',
      'Your financial information will be used for personalized AI property analysis including affordability assessment, investment recommendations, and transaction advice.'
    );
  };

  // Calculate stats
  const stats = {
    totalProperties: properties.length,
    toured: properties.filter((p) => p.status === 'toured').length,
    interested: properties.filter((p) => p.status === 'interested').length,
    offersMade: properties.filter((p) => p.status === 'offer_made').length,
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Account Section */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Input
            label="Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email || ''}</Text>
          </View>

          <Button
            title="Update Profile"
            onPress={handleUpdateProfile}
            variant="outline"
            size="sm"
          />
        </Card>

        {/* Household Section */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Household</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Household Name</Text>
            <Text style={styles.infoValue}>{household?.name || 'Not set'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Invite Code</Text>
            <TouchableOpacity
              onPress={() => {
                // In production, use Clipboard API
                Alert.alert('Invite Code', household?.invite_code || 'N/A');
              }}
            >
              <Text style={[styles.infoValue, styles.inviteCode]}>
                {household?.invite_code || 'N/A'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inviteHint}>
            Share this code with your partner to join the household
          </Text>
        </Card>

        {/* Calculator Defaults */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Calculator Defaults</Text>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Interest Rate %"
                placeholder="6.5"
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Down Payment %"
                placeholder="20"
                value={downPayment}
                onChangeText={setDownPayment}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Loan Term (years)"
                placeholder="30"
                value={loanTerm}
                onChangeText={setLoanTerm}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Property Tax Rate %"
                placeholder="1.2"
                value={propertyTaxRate}
                onChangeText={setPropertyTaxRate}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Input
            label="Insurance Rate % (annual)"
            placeholder="0.35"
            value={insuranceRate}
            onChangeText={setInsuranceRate}
            keyboardType="decimal-pad"
          />

          <Button
            title="Save Defaults"
            onPress={handleSaveDefaults}
            variant="outline"
            size="sm"
          />
        </Card>

        {/* Financial Profile */}
        <Card style={[styles.card, hasFinancialData && styles.cardConfigured]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Financial Profile</Text>
            {hasFinancialData && (
              <View style={[styles.savedBadge, financialSaved && styles.savedBadgeJustSaved]}>
                <Text style={styles.savedBadgeIcon}>{financialSaved ? '✓' : '💰'}</Text>
                <Text style={[styles.savedBadgeText, financialSaved && styles.savedBadgeTextJustSaved]}>
                  {financialSaved ? 'Saved!' : 'Configured'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.apiKeyHint}>
            {hasFinancialData
              ? 'Your financial info is being used for personalized AI analysis. Update anytime.'
              : 'Add your financial info to get personalized AI investment analysis, affordability assessment, and transaction recommendations.'}
          </Text>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Annual Income"
                placeholder="150000"
                value={annualIncome}
                onChangeText={setAnnualIncome}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Monthly Debts"
                placeholder="500"
                value={monthlyDebts}
                onChangeText={setMonthlyDebts}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Down Payment Available"
                placeholder="100000"
                value={downPaymentAvailable}
                onChangeText={setDownPaymentAvailable}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Total Savings"
                placeholder="150000"
                value={totalSavings}
                onChangeText={setTotalSavings}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Target Monthly Payment"
                placeholder="3000"
                value={targetPayment}
                onChangeText={setTargetPayment}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Investment Horizon (years)"
                placeholder="10"
                value={investmentHorizon}
                onChangeText={setInvestmentHorizon}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Credit Score Range</Text>
          <View style={styles.creditScoreRow}>
            {(['excellent', 'good', 'fair', 'poor'] as const).map((score) => (
              <TouchableOpacity
                key={score}
                style={[
                  styles.creditScoreOption,
                  creditScore === score && styles.creditScoreOptionSelected,
                ]}
                onPress={() => setCreditScore(score)}
              >
                <Text
                  style={[
                    styles.creditScoreText,
                    creditScore === score && styles.creditScoreTextSelected,
                  ]}
                >
                  {score.charAt(0).toUpperCase() + score.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>First-time Home Buyer</Text>
            <Switch
              value={firstTimeBuyer}
              onValueChange={setFirstTimeBuyer}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <Button
            title="Save Financial Profile"
            onPress={handleSaveFinancialProfile}
            variant="outline"
            size="sm"
          />
        </Card>

        {/* Claude API Key */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>AI Features (Claude)</Text>
          <Text style={styles.apiKeyHint}>
            Add your Anthropic API key to enable AI-powered property analysis and data extraction.
          </Text>

          {hasAnthropicKey ? (
            <View style={styles.apiKeyConfigured}>
              <View style={styles.apiKeyStatus}>
                <Text style={styles.apiKeyStatusIcon}>✓</Text>
                <Text style={styles.apiKeyStatusText}>Claude API Key Configured</Text>
              </View>
              <Button
                title="Remove Key"
                onPress={handleClearAnthropicKey}
                variant="danger"
                size="sm"
              />
            </View>
          ) : (
            <View>
              <Input
                label="Anthropic API Key"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChangeText={setAnthropicKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button
                title="Save API Key"
                onPress={handleSaveAnthropicKey}
                loading={isSavingKey}
                variant="outline"
                size="sm"
              />
              <Text style={styles.apiKeyNote}>
                Get your API key at console.anthropic.com
              </Text>
            </View>
          )}
        </Card>

        {/* Stats */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Your Search Stats</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalProperties}</Text>
              <Text style={styles.statLabel}>Total Properties</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.interested}</Text>
              <Text style={styles.statLabel}>Interested</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.toured}</Text>
              <Text style={styles.statLabel}>Toured</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.offersMade}</Text>
              <Text style={styles.statLabel}>Offers Made</Text>
            </View>
          </View>
        </Card>

        {/* About */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Built with</Text>
            <Text style={styles.infoValue}>React Native + Expo</Text>
          </View>

          <TouchableOpacity
            style={styles.resetOnboardingButton}
            onPress={async () => {
              await resetOnboarding();
              Alert.alert(
                'Onboarding Reset',
                'Sign out and sign back in to see the onboarding screens again.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.resetOnboardingText}>Reset Onboarding</Text>
          </TouchableOpacity>
        </Card>

        {/* Sign Out */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="danger"
          style={styles.signOutButton}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>HomeScout</Text>
          <Text style={styles.footerSubtext}>Find your perfect home together</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  inviteCode: {
    color: colors.primary,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  inviteHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  signOutButton: {
    marginTop: spacing.lg,
  },
  apiKeyHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  apiKeyConfigured: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  apiKeyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  apiKeyStatusIcon: {
    fontSize: fontSize.lg,
    color: colors.success,
    marginRight: spacing.sm,
  },
  apiKeyStatusText: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  apiKeyNote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  footerSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  creditScoreRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  creditScoreOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  creditScoreOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  creditScoreText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  creditScoreTextSelected: {
    color: colors.surface,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  switchLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardConfigured: {
    borderWidth: 2,
    borderColor: colors.success,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  savedBadgeJustSaved: {
    backgroundColor: colors.success,
  },
  savedBadgeIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing.xs,
  },
  savedBadgeText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.semibold,
  },
  savedBadgeTextJustSaved: {
    color: colors.surface,
  },
  resetOnboardingButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  resetOnboardingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
