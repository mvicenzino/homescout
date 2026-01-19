import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePropertyStore, getPropertyWithRatings } from '../store/propertyStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { Card, StarRating, Badge, getStatusBadgeVariant, Button } from '../components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import {
  formatCurrency,
  formatCurrencyWithCents,
  formatBedsBaths,
  formatPricePerSqft,
  formatPropertyStatus,
} from '../lib/formatters';
import { calculateTotalMonthlyCost } from '../lib/calculators';
import { Property } from '../types';

export function CompareScreen() {
  const { properties, isLoading, fetchProperties, selectedPropertyIds, clearSelection, togglePropertySelection } =
    usePropertyStore();
  const { user } = useAuthStore();
  const { calculatorDefaults } = useSettingsStore();

  const selectedProperties = useMemo(() => {
    return selectedPropertyIds
      .map((id) => properties.find((p) => p.id === id))
      .filter(Boolean) as Property[];
  }, [properties, selectedPropertyIds]);

  // Calculate monthly costs for comparison
  const propertyCosts = useMemo(() => {
    return selectedProperties.map((property) => {
      const downPayment = property.price * (calculatorDefaults.downPaymentPercent / 100);
      return calculateTotalMonthlyCost({
        purchasePrice: property.price,
        downPayment,
        annualInterestRate: calculatorDefaults.interestRate,
        loanTermYears: calculatorDefaults.loanTermYears,
        propertyTaxAnnual:
          property.property_tax_annual ||
          property.price * (calculatorDefaults.propertyTaxRate / 100),
        insuranceAnnual:
          property.insurance_annual || property.price * (calculatorDefaults.insuranceRate / 100),
        hoaMonthly: property.hoa_monthly || 0,
      });
    });
  }, [selectedProperties, calculatorDefaults]);

  // Determine winners for each category
  const winners = useMemo(() => {
    if (selectedProperties.length < 2) return {};

    const [p1, p2] = selectedProperties;
    const [c1, c2] = propertyCosts;

    return {
      price: p1.price < p2.price ? 0 : p1.price > p2.price ? 1 : -1,
      pricePerSqft:
        p1.sqft && p2.sqft
          ? p1.price / p1.sqft < p2.price / p2.sqft
            ? 0
            : p1.price / p1.sqft > p2.price / p2.sqft
            ? 1
            : -1
          : -1,
      sqft: p1.sqft > p2.sqft ? 0 : p1.sqft < p2.sqft ? 1 : -1,
      monthlyCost: c1.total < c2.total ? 0 : c1.total > c2.total ? 1 : -1,
      beds: p1.beds > p2.beds ? 0 : p1.beds < p2.beds ? 1 : -1,
      baths: p1.baths > p2.baths ? 0 : p1.baths < p2.baths ? 1 : -1,
    };
  }, [selectedProperties, propertyCosts]);

  if (selectedProperties.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Properties Selected</Text>
          <Text style={styles.emptyText}>
            Select 2 properties from the Home tab to compare them side by side.
          </Text>
          <Text style={styles.emptyHint}>
            Tap the + button on any property card to select it.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedProperties.length === 1) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Select One More Property</Text>
          <Text style={styles.emptyText}>
            You have 1 property selected. Select one more to compare.
          </Text>
          <Card style={styles.selectedPreview}>
            <Text style={styles.previewPrice}>{formatCurrency(selectedProperties[0].price)}</Text>
            <Text style={styles.previewAddress}>{selectedProperties[0].address}</Text>
          </Card>
          <Button title="Clear Selection" variant="outline" onPress={clearSelection} />
        </View>
      </SafeAreaView>
    );
  }

  const ComparisonRow = ({
    label,
    values,
    winnerIndex,
    format = (v: any) => v,
  }: {
    label: string;
    values: [any, any];
    winnerIndex?: number;
    format?: (v: any) => string;
  }) => (
    <View style={styles.comparisonRow}>
      <View style={styles.comparisonLabel}>
        <Text style={styles.labelText}>{label}</Text>
      </View>
      <View style={styles.comparisonValues}>
        {values.map((value, index) => (
          <View
            key={index}
            style={[styles.comparisonValue, winnerIndex === index && styles.winnerValue]}
          >
            <Text
              style={[styles.valueText, winnerIndex === index && styles.winnerText]}
            >
              {format(value)}
            </Text>
            {winnerIndex === index && <Text style={styles.winnerBadge}>Best</Text>}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header with property names */}
      <View style={styles.header}>
        {selectedProperties.map((property, index) => (
          <View key={property.id} style={styles.propertyHeader}>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => togglePropertySelection(property.id)}
            >
              <Text style={styles.removeButtonText}>{'\u00D7'}</Text>
            </TouchableOpacity>
            <Text style={styles.propertyPrice}>{formatCurrency(property.price)}</Text>
            <Text style={styles.propertyAddress} numberOfLines={1}>
              {property.address}
            </Text>
            <Text style={styles.propertyLocation}>
              {property.city}, {property.state}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchProperties} />
        }
      >
        {/* Status & Rating */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Status & Rating</Text>

          <View style={styles.comparisonRow}>
            <View style={styles.comparisonLabel}>
              <Text style={styles.labelText}>Status</Text>
            </View>
            <View style={styles.comparisonValues}>
              {selectedProperties.map((property) => (
                <View key={property.id} style={styles.comparisonValue}>
                  <Badge
                    label={formatPropertyStatus(property.status)}
                    variant={getStatusBadgeVariant(property.status)}
                  />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.comparisonRow}>
            <View style={styles.comparisonLabel}>
              <Text style={styles.labelText}>Your Rating</Text>
            </View>
            <View style={styles.comparisonValues}>
              {selectedProperties.map((property) => {
                const withRatings = getPropertyWithRatings(property, user?.id || '');
                return (
                  <View key={property.id} style={styles.comparisonValue}>
                    <StarRating rating={withRatings.my_rating || 0} size="sm" />
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.comparisonRow}>
            <View style={styles.comparisonLabel}>
              <Text style={styles.labelText}>Partner Rating</Text>
            </View>
            <View style={styles.comparisonValues}>
              {selectedProperties.map((property) => {
                const withRatings = getPropertyWithRatings(property, user?.id || '');
                return (
                  <View key={property.id} style={styles.comparisonValue}>
                    <StarRating rating={withRatings.partner_rating || 0} size="sm" />
                  </View>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Price Comparison */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Price</Text>

          <ComparisonRow
            label="Listing Price"
            values={[selectedProperties[0].price, selectedProperties[1].price]}
            winnerIndex={winners.price}
            format={formatCurrency}
          />

          <ComparisonRow
            label="Price/Sqft"
            values={[
              selectedProperties[0].sqft
                ? selectedProperties[0].price / selectedProperties[0].sqft
                : 0,
              selectedProperties[1].sqft
                ? selectedProperties[1].price / selectedProperties[1].sqft
                : 0,
            ]}
            winnerIndex={winners.pricePerSqft}
            format={(v) => (v ? `$${Math.round(v)}` : 'N/A')}
          />

          <ComparisonRow
            label="Monthly Cost"
            values={[propertyCosts[0].total, propertyCosts[1].total]}
            winnerIndex={winners.monthlyCost}
            format={formatCurrencyWithCents}
          />
        </Card>

        {/* Property Details */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Property Details</Text>

          <ComparisonRow
            label="Bedrooms"
            values={[selectedProperties[0].beds, selectedProperties[1].beds]}
            winnerIndex={winners.beds}
          />

          <ComparisonRow
            label="Bathrooms"
            values={[selectedProperties[0].baths, selectedProperties[1].baths]}
            winnerIndex={winners.baths}
          />

          <ComparisonRow
            label="Square Feet"
            values={[selectedProperties[0].sqft, selectedProperties[1].sqft]}
            winnerIndex={winners.sqft}
            format={(v) => v.toLocaleString()}
          />

          <ComparisonRow
            label="Lot Size"
            values={[
              selectedProperties[0].lot_size,
              selectedProperties[1].lot_size,
            ]}
            format={(v) => (v ? `${v.toLocaleString()} sqft` : 'N/A')}
          />

          <ComparisonRow
            label="Year Built"
            values={[
              selectedProperties[0].year_built,
              selectedProperties[1].year_built,
            ]}
            format={(v) => v?.toString() || 'N/A'}
          />

          <ComparisonRow
            label="Garage"
            values={[selectedProperties[0].garage, selectedProperties[1].garage]}
            format={(v) => (v ? `${v} car` : 'N/A')}
          />
        </Card>

        {/* Monthly Costs Breakdown */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Monthly Cost Breakdown</Text>

          <ComparisonRow
            label="P&I"
            values={[
              propertyCosts[0].principal_interest,
              propertyCosts[1].principal_interest,
            ]}
            format={formatCurrencyWithCents}
          />

          <ComparisonRow
            label="Property Tax"
            values={[propertyCosts[0].property_tax, propertyCosts[1].property_tax]}
            format={formatCurrencyWithCents}
          />

          <ComparisonRow
            label="Insurance"
            values={[propertyCosts[0].insurance, propertyCosts[1].insurance]}
            format={formatCurrencyWithCents}
          />

          <ComparisonRow
            label="HOA"
            values={[propertyCosts[0].hoa, propertyCosts[1].hoa]}
            format={formatCurrencyWithCents}
          />

          {(propertyCosts[0].pmi > 0 || propertyCosts[1].pmi > 0) && (
            <ComparisonRow
              label="PMI"
              values={[propertyCosts[0].pmi, propertyCosts[1].pmi]}
              format={formatCurrencyWithCents}
            />
          )}
        </Card>

        <Button
          title="Clear Comparison"
          variant="outline"
          onPress={clearSelection}
          style={styles.clearButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  selectedPreview: {
    marginVertical: spacing.lg,
    alignItems: 'center',
  },
  previewPrice: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  previewAddress: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  propertyHeader: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  propertyPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  propertyAddress: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  propertyLocation: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
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
  comparisonRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  comparisonLabel: {
    width: 100,
    justifyContent: 'center',
  },
  labelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  comparisonValues: {
    flex: 1,
    flexDirection: 'row',
  },
  comparisonValue: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
  },
  winnerValue: {
    backgroundColor: colors.success + '15',
  },
  valueText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  winnerText: {
    color: colors.success,
    fontWeight: fontWeight.bold,
  },
  winnerBadge: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginTop: 2,
  },
  clearButton: {
    marginTop: spacing.md,
  },
});
