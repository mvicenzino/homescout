import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Input } from '../components/ui';
import { useSettingsStore } from '../store/settingsStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { formatCurrency, formatCurrencyWithCents, formatPercent } from '../lib/formatters';
import {
  calculateMortgage,
  calculateTotalMonthlyCost,
  calculateMaxAffordablePrice,
  estimateClosingCosts,
} from '../lib/calculators';

type CalculatorType = 'mortgage' | 'trueCost' | 'affordability';

export function CalculatorsScreen() {
  const { calculatorDefaults } = useSettingsStore();
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>('mortgage');

  // Mortgage Calculator State
  const [purchasePrice, setPurchasePrice] = useState('500000');
  const [downPaymentPercent, setDownPaymentPercent] = useState(
    calculatorDefaults.downPaymentPercent.toString()
  );
  const [interestRate, setInterestRate] = useState(calculatorDefaults.interestRate.toString());
  const [loanTerm, setLoanTerm] = useState(calculatorDefaults.loanTermYears.toString());

  // True Cost State
  const [propertyTax, setPropertyTax] = useState('');
  const [insurance, setInsurance] = useState('');
  const [hoa, setHoa] = useState('0');

  // Affordability State
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyDebts, setMonthlyDebts] = useState('0');
  const [targetDti, setTargetDti] = useState('36');
  const [downPaymentAvailable, setDownPaymentAvailable] = useState('');

  // Mortgage Calculations
  const mortgageResult = useMemo(() => {
    const price = parseFloat(purchasePrice) || 0;
    const downPct = parseFloat(downPaymentPercent) || 0;
    const rate = parseFloat(interestRate) || 0;
    const term = parseInt(loanTerm) || 30;
    const downPayment = price * (downPct / 100);

    return calculateMortgage(price, downPayment, rate, term);
  }, [purchasePrice, downPaymentPercent, interestRate, loanTerm]);

  // True Cost Calculations
  const trueCostResult = useMemo(() => {
    const price = parseFloat(purchasePrice) || 0;
    const downPct = parseFloat(downPaymentPercent) || 0;
    const rate = parseFloat(interestRate) || 0;
    const term = parseInt(loanTerm) || 30;
    const downPayment = price * (downPct / 100);

    const annualTax = propertyTax
      ? parseFloat(propertyTax)
      : price * (calculatorDefaults.propertyTaxRate / 100);
    const annualInsurance = insurance
      ? parseFloat(insurance)
      : price * (calculatorDefaults.insuranceRate / 100);
    const monthlyHoa = parseFloat(hoa) || 0;

    return calculateTotalMonthlyCost({
      purchasePrice: price,
      downPayment,
      annualInterestRate: rate,
      loanTermYears: term,
      propertyTaxAnnual: annualTax,
      insuranceAnnual: annualInsurance,
      hoaMonthly: monthlyHoa,
    });
  }, [purchasePrice, downPaymentPercent, interestRate, loanTerm, propertyTax, insurance, hoa]);

  // Closing Costs
  const closingCosts = useMemo(() => {
    const price = parseFloat(purchasePrice) || 0;
    return estimateClosingCosts(price, mortgageResult.principal);
  }, [purchasePrice, mortgageResult.principal]);

  // Affordability Calculations
  const affordabilityResult = useMemo(() => {
    const income = parseFloat(monthlyIncome) || 0;
    const debts = parseFloat(monthlyDebts) || 0;
    const dti = parseFloat(targetDti) || 36;
    const downPayment = parseFloat(downPaymentAvailable) || 0;
    const rate = parseFloat(interestRate) || calculatorDefaults.interestRate;
    const term = parseInt(loanTerm) || calculatorDefaults.loanTermYears;

    if (!income) return null;

    const maxPrice = calculateMaxAffordablePrice({
      grossMonthlyIncome: income,
      monthlyDebts: debts,
      targetDti: dti,
      downPaymentAvailable: downPayment,
      annualInterestRate: rate,
      loanTermYears: term,
    });

    // Calculate comfortable range (28% housing ratio)
    const comfortablePrice = calculateMaxAffordablePrice({
      grossMonthlyIncome: income,
      monthlyDebts: debts,
      targetDti: 28,
      downPaymentAvailable: downPayment,
      annualInterestRate: rate,
      loanTermYears: term,
    });

    return {
      maxPrice,
      comfortablePrice,
      maxMonthlyHousing: (income * dti) / 100 - debts,
    };
  }, [monthlyIncome, monthlyDebts, targetDti, downPaymentAvailable, interestRate, loanTerm]);

  const calculators: { key: CalculatorType; label: string }[] = [
    { key: 'mortgage', label: 'Mortgage' },
    { key: 'trueCost', label: 'True Cost' },
    { key: 'affordability', label: 'Affordability' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Calculator Tabs */}
      <View style={styles.tabs}>
        {calculators.map((calc) => (
          <TouchableOpacity
            key={calc.key}
            style={[styles.tab, activeCalculator === calc.key && styles.tabActive]}
            onPress={() => setActiveCalculator(calc.key)}
          >
            <Text
              style={[styles.tabText, activeCalculator === calc.key && styles.tabTextActive]}
            >
              {calc.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Common Inputs */}
        {(activeCalculator === 'mortgage' || activeCalculator === 'trueCost') && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Loan Details</Text>

            <Input
              label="Purchase Price"
              placeholder="500000"
              value={purchasePrice}
              onChangeText={(v) => setPurchasePrice(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Input
                  label="Down Payment %"
                  placeholder="20"
                  value={downPaymentPercent}
                  onChangeText={setDownPaymentPercent}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.flex1}>
                <Input
                  label="Interest Rate %"
                  placeholder="6.5"
                  value={interestRate}
                  onChangeText={setInterestRate}
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
                <View style={styles.calculatedField}>
                  <Text style={styles.calculatedLabel}>Down Payment</Text>
                  <Text style={styles.calculatedValue}>
                    {formatCurrency(
                      (parseFloat(purchasePrice) || 0) *
                        ((parseFloat(downPaymentPercent) || 0) / 100)
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* Mortgage Results */}
        {activeCalculator === 'mortgage' && (
          <>
            <Card style={styles.resultCard}>
              <Text style={styles.resultLabel}>Monthly Payment (P&I)</Text>
              <Text style={styles.resultValue}>
                {formatCurrencyWithCents(mortgageResult.monthlyPayment)}
              </Text>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Loan Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Loan Amount</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(mortgageResult.principal)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Interest</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(mortgageResult.totalInterest)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total of Payments</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(mortgageResult.totalPayment)}
                </Text>
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Estimated Closing Costs</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Loan Origination</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(closingCosts.loan_origination)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Title Insurance</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(closingCosts.title_insurance)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Appraisal & Fees</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(closingCosts.appraisal + closingCosts.escrow_fees + closingCosts.recording_fees)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Prepaid Taxes & Insurance</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(closingCosts.prepaid_taxes + closingCosts.prepaid_insurance)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Closing Costs</Text>
                <Text style={styles.totalValue}>{formatCurrency(closingCosts.total)}</Text>
              </View>
            </Card>
          </>
        )}

        {/* True Cost */}
        {activeCalculator === 'trueCost' && (
          <>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Additional Costs</Text>

              <Input
                label="Annual Property Tax (leave blank for estimate)"
                placeholder={`${formatCurrency((parseFloat(purchasePrice) || 0) * 0.012)} estimated`}
                value={propertyTax}
                onChangeText={(v) => setPropertyTax(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />

              <Input
                label="Annual Insurance (leave blank for estimate)"
                placeholder={`${formatCurrency((parseFloat(purchasePrice) || 0) * 0.0035)} estimated`}
                value={insurance}
                onChangeText={(v) => setInsurance(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />

              <Input
                label="Monthly HOA"
                placeholder="0"
                value={hoa}
                onChangeText={(v) => setHoa(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />
            </Card>

            <Card style={styles.resultCard}>
              <Text style={styles.resultLabel}>Total Monthly Cost</Text>
              <Text style={styles.resultValue}>
                {formatCurrencyWithCents(trueCostResult.total)}
              </Text>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Monthly Breakdown</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Principal & Interest</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrencyWithCents(trueCostResult.principal_interest)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Property Tax</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrencyWithCents(trueCostResult.property_tax)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Insurance</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrencyWithCents(trueCostResult.insurance)}
                </Text>
              </View>
              {trueCostResult.hoa > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>HOA</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrencyWithCents(trueCostResult.hoa)}
                  </Text>
                </View>
              )}
              {trueCostResult.pmi > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>PMI</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrencyWithCents(trueCostResult.pmi)}
                  </Text>
                </View>
              )}
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>First Year Costs</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Down Payment</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(
                    (parseFloat(purchasePrice) || 0) *
                      ((parseFloat(downPaymentPercent) || 0) / 100)
                  )}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Closing Costs</Text>
                <Text style={styles.summaryValue}>{formatCurrency(closingCosts.total)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>12 Months Payments</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(trueCostResult.total * 12)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total First Year</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(
                    (parseFloat(purchasePrice) || 0) *
                      ((parseFloat(downPaymentPercent) || 0) / 100) +
                      closingCosts.total +
                      trueCostResult.total * 12
                  )}
                </Text>
              </View>
            </Card>
          </>
        )}

        {/* Affordability */}
        {activeCalculator === 'affordability' && (
          <>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Your Finances</Text>

              <Input
                label="Gross Monthly Income (Combined)"
                placeholder="10000"
                value={monthlyIncome}
                onChangeText={(v) => setMonthlyIncome(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />

              <Input
                label="Monthly Debts (car, student loans, etc.)"
                placeholder="500"
                value={monthlyDebts}
                onChangeText={(v) => setMonthlyDebts(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />

              <Input
                label="Down Payment Available"
                placeholder="100000"
                value={downPaymentAvailable}
                onChangeText={(v) => setDownPaymentAvailable(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Input
                    label="Target DTI %"
                    placeholder="36"
                    value={targetDti}
                    onChangeText={setTargetDti}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.flex1}>
                  <Input
                    label="Interest Rate %"
                    placeholder="6.5"
                    value={interestRate}
                    onChangeText={setInterestRate}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </Card>

            {affordabilityResult && (
              <>
                <Card style={styles.resultCard}>
                  <Text style={styles.resultLabel}>Maximum Home Price</Text>
                  <Text style={styles.resultValue}>
                    {formatCurrency(affordabilityResult.maxPrice)}
                  </Text>
                  <Text style={styles.resultNote}>
                    Based on {targetDti}% DTI ratio
                  </Text>
                </Card>

                <Card style={styles.card}>
                  <Text style={styles.cardTitle}>Affordability Range</Text>
                  <View style={styles.rangeBar}>
                    <View
                      style={[
                        styles.rangeComfortable,
                        {
                          width: `${(affordabilityResult.comfortablePrice / affordabilityResult.maxPrice) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.rangeLabels}>
                    <View>
                      <Text style={styles.rangeLabel}>Comfortable</Text>
                      <Text style={styles.rangeValue}>
                        {formatCurrency(affordabilityResult.comfortablePrice)}
                      </Text>
                    </View>
                    <View style={styles.rangeRight}>
                      <Text style={styles.rangeLabel}>Maximum</Text>
                      <Text style={styles.rangeValue}>
                        {formatCurrency(affordabilityResult.maxPrice)}
                      </Text>
                    </View>
                  </View>
                </Card>

                <Card style={styles.card}>
                  <Text style={styles.cardTitle}>Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Max Monthly Housing</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrencyWithCents(affordabilityResult.maxMonthlyHousing)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Current DTI (debts only)</Text>
                    <Text style={styles.summaryValue}>
                      {formatPercent(
                        ((parseFloat(monthlyDebts) || 0) /
                          (parseFloat(monthlyIncome) || 1)) *
                          100
                      )}
                    </Text>
                  </View>
                </Card>
              </>
            )}

            {!monthlyIncome && (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>
                  Enter your income to calculate affordability
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
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
  cardTitle: {
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
  calculatedField: {
    marginBottom: spacing.md,
  },
  calculatedLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  calculatedValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  resultCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  resultLabel: {
    fontSize: fontSize.md,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  resultValue: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  resultNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  rangeBar: {
    height: 8,
    backgroundColor: colors.warning + '30',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  rangeComfortable: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeRight: {
    alignItems: 'flex-end',
  },
  rangeLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  rangeValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});
