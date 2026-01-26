import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActionSheetIOS,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../components/ui';
import { DemoBanner } from '../components/DemoBanner';
import { usePropertyStore } from '../store/propertyStore';
import { useAuthStore } from '../store/authStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { formatCurrency, formatBedsBaths } from '../lib/formatters';
import { calculateMatchScore, calculateDaysOnMarket, getDaysOnMarketBadge } from '../lib/matchScore';
import { Property, PropertyStatus, HomeStackParamList, HomeBuyerProfile } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'PropertyList'>;
};

type FilterOption = 'all' | PropertyStatus;

const statusConfig: Record<PropertyStatus, { label: string; color: string; bg: string }> = {
  interested: { label: 'Interested', color: colors.primary, bg: colors.primary + '20' },
  toured: { label: 'Toured', color: '#8B5CF6', bg: '#8B5CF620' },
  offer_made: { label: 'Offer Made', color: '#F59E0B', bg: '#F59E0B20' },
  under_contract: { label: 'Under Contract', color: '#10B981', bg: '#10B98120' },
  rejected: { label: 'Not Interested', color: '#6B7280', bg: '#6B728020' },
  purchased: { label: 'Purchased', color: '#059669', bg: '#05966920' },
};

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'interested', label: 'Interested' },
  { value: 'toured', label: 'Toured' },
  { value: 'offer_made', label: 'Offer Made' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'rejected', label: 'Not Interested' },
  { value: 'purchased', label: 'Purchased' },
];

const statusOptions: PropertyStatus[] = [
  'interested',
  'toured',
  'offer_made',
  'under_contract',
  'rejected',
  'purchased',
];

export function HomeScreen({ navigation }: Props) {
  const { properties, isLoading, fetchProperties, loadDemoData, updatePropertyStatus, selectedPropertyIds, togglePropertySelection } = usePropertyStore();
  const { user, isDemoMode } = useAuthStore();
  const [filter, setFilter] = useState<FilterOption>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleRefresh = () => {
    if (isDemoMode) {
      // Reload demo data instead of fetching from Supabase
      loadDemoData();
    } else {
      fetchProperties();
    }
  };

  // Get buyer profile for match scoring (only for individual users)
  const buyerProfile = user?.user_type !== 'broker'
    ? (user?.preferences?.profile as HomeBuyerProfile | undefined)
    : undefined;

  // Collect all unique tags across properties
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    properties.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          if (t.tag) tagSet.add(t.tag);
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [properties]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredProperties = useMemo(() => {
    let result = properties;

    // Filter by status
    if (filter !== 'all') {
      result = result.filter((p) => p.status === filter);
    }

    // Filter by tags (show properties that have ANY of the selected tags)
    if (selectedTags.length > 0) {
      result = result.filter((p) => {
        if (!Array.isArray(p.tags)) return false;
        const propertyTags = p.tags.map((t) => t.tag);
        return selectedTags.some((tag) => propertyTags.includes(tag));
      });
    }

    return result;
  }, [properties, filter, selectedTags]);

  const handleStatusChange = (property: Property) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...statusOptions.map((s) => statusConfig[s].label)],
          cancelButtonIndex: 0,
          title: 'Change Status',
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            updatePropertyStatus(property.id, statusOptions[buttonIndex - 1]);
          }
        }
      );
    } else {
      Alert.alert(
        'Change Status',
        'Select a new status',
        [
          { text: 'Cancel', style: 'cancel' },
          ...statusOptions.map((status) => ({
            text: statusConfig[status].label,
            onPress: () => updatePropertyStatus(property.id, status),
          })),
        ]
      );
    }
  };

  // Check if property is "Hot" (new listing or has price drop)
  const isHotProperty = (property: Property) => {
    // Check if listing is less than 7 days old
    if (property.list_date) {
      const listDate = new Date(property.list_date);
      const daysSinceListed = Math.floor((Date.now() - listDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceListed <= 7) return true;
    }
    // Check if days on market is low
    if (property.days_on_market !== undefined && property.days_on_market <= 7) return true;
    return false;
  };

  // Check for price drop
  const getPriceDrop = (property: Property) => {
    if (property.original_list_price && property.original_list_price > property.price) {
      const drop = property.original_list_price - property.price;
      const dropPercent = (drop / property.original_list_price) * 100;
      return { amount: drop, percent: dropPercent };
    }
    return null;
  };

  const renderProperty = ({ item }: { item: Property }) => {
    const status = statusConfig[item.status];
    const isSelectedForCompare = selectedPropertyIds.includes(item.id);
    const isHot = isHotProperty(item);
    const priceDrop = getPriceDrop(item);

    // Calculate match score for buyers
    const matchScore = calculateMatchScore(item, buyerProfile);

    // Calculate days on market
    const daysOnMarket = calculateDaysOnMarket(item.listing_date || item.list_date);
    const domBadge = getDaysOnMarketBadge(daysOnMarket);

    return (
      <Card
        style={[styles.propertyCard, isSelectedForCompare && styles.propertyCardSelected]}
        onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}
      >
        {/* Top Row: Status Tag + Match Score + Compare Button */}
        <View style={styles.topRow}>
          <View style={styles.topLeftBadges}>
            <TouchableOpacity
              style={[styles.statusTag, { backgroundColor: status.bg }]}
              onPress={() => handleStatusChange(item)}
            >
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </TouchableOpacity>
            {matchScore && (
              <View style={[styles.matchBadge, { backgroundColor: matchScore.color + '20' }]}>
                <Text style={[styles.matchBadgeText, { color: matchScore.color }]}>
                  {matchScore.score}% {matchScore.label}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.compareButton, isSelectedForCompare && styles.compareButtonActive]}
            onPress={() => togglePropertySelection(item.id)}
          >
            <Text style={[styles.compareButtonText, isSelectedForCompare && styles.compareButtonTextActive]}>
              {isSelectedForCompare ? '✓' : '+'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Price Row with Badges */}
        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.propertyPrice}>{formatCurrency(item.price)}</Text>
            {priceDrop && (
              <Text style={styles.originalPrice}>
                was {formatCurrency(item.original_list_price!)}
              </Text>
            )}
          </View>
          {/* Quick Action Badges */}
          <View style={styles.quickBadges}>
            {domBadge && (
              <View style={[styles.domBadge, { backgroundColor: domBadge.bgColor }]}>
                <Text style={[styles.domBadgeText, { color: domBadge.color }]}>
                  {domBadge.label}
                </Text>
              </View>
            )}
            {isHot && !domBadge && (
              <View style={styles.hotBadge}>
                <Text style={styles.hotBadgeText}>HOT</Text>
              </View>
            )}
            {priceDrop && (
              <View style={styles.priceDropBadge}>
                <Text style={styles.priceDropBadgeText}>
                  -{priceDrop.percent.toFixed(0)}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Address */}
        <Text style={styles.propertyAddress} numberOfLines={1}>
          {item.address}
        </Text>
        <Text style={styles.propertyLocation}>
          {item.city}, {item.state} {item.zip}
        </Text>

        {/* Specs Row */}
        <View style={styles.specsRow}>
          <View style={styles.specItem}>
            <Text style={styles.specValue}>{item.beds || 0}</Text>
            <Text style={styles.specLabel}>beds</Text>
          </View>
          <View style={styles.specDivider} />
          <View style={styles.specItem}>
            <Text style={styles.specValue}>{item.baths || 0}</Text>
            <Text style={styles.specLabel}>baths</Text>
          </View>
          <View style={styles.specDivider} />
          <View style={styles.specItem}>
            <Text style={styles.specValue}>{(item.sqft || 0).toLocaleString()}</Text>
            <Text style={styles.specLabel}>sqft</Text>
          </View>
          {item.year_built && (
            <>
              <View style={styles.specDivider} />
              <View style={styles.specItem}>
                <Text style={styles.specValue}>{item.year_built}</Text>
                <Text style={styles.specLabel}>built</Text>
              </View>
            </>
          )}
        </View>

        {/* Custom Tags */}
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag) => (
              <View key={tag.id} style={styles.customTag}>
                <Text style={styles.customTagText}>{String(tag.tag || '')}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  };

  const propertyCount = filteredProperties.length;
  const totalCount = properties.length;

  return (
    <View style={styles.container}>
      <DemoBanner />
      {/* Header Banner with Gradient */}
      <LinearGradient
        colors={['#4F46E5', '#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBanner}
      >
        <SafeAreaView edges={isDemoMode ? [] : ['top']} style={styles.headerSafeArea}>
          <View style={styles.headerBannerContent}>
            <Text style={styles.headerBannerTitle}>Properties</Text>
            <Text style={styles.headerBannerSubtitle}>
              {filter === 'all' && selectedTags.length === 0
                ? `${totalCount} total`
                : `${propertyCount} of ${totalCount}`}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Comparison Banner */}
      {selectedPropertyIds.length > 0 && (
        <TouchableOpacity
          style={styles.compareBanner}
          onPress={() => navigation.getParent()?.navigate('Compare')}
        >
          <Text style={styles.compareBannerText}>
            {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? 'property' : 'properties'} selected
          </Text>
          <Text style={styles.compareBannerAction}>
            {selectedPropertyIds.length >= 2 ? 'Compare Now →' : 'Select 1 more to compare'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Status Filter Bar */}
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          data={filterOptions}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isActive = filter === item.value;
            const statusStyle = item.value !== 'all' ? statusConfig[item.value as PropertyStatus] : null;

            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                  isActive && statusStyle && { backgroundColor: statusStyle.color },
                ]}
                onPress={() => setFilter(item.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Tag Filter Bar */}
      {allTags.length > 0 && (
        <View style={styles.tagFilterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagFilterList}
          >
            {selectedTags.length > 0 && (
              <TouchableOpacity
                style={styles.clearTagsButton}
                onPress={() => setSelectedTags([])}
              >
                <Text style={styles.clearTagsText}>Clear</Text>
              </TouchableOpacity>
            )}
            {allTags.map((tag) => {
              if (!tag) return null;
              const isSelected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagFilterChip,
                    isSelected && styles.tagFilterChipActive,
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text
                    style={[
                      styles.tagFilterChipText,
                      isSelected && styles.tagFilterChipTextActive,
                    ]}
                  >
                    {String(tag)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Property List */}
      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => item.id}
        renderItem={renderProperty}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No properties yet' : `No ${statusConfig[filter as PropertyStatus]?.label.toLowerCase()} properties`}
            </Text>
            <Text style={styles.emptySubtext}>
              Tap + to add your first property
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProperty', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBanner: {
    paddingBottom: spacing.md,
  },
  headerSafeArea: {
    paddingTop: spacing.sm,
  },
  headerBannerContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerBannerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  headerBannerSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  compareBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  compareBannerText: {
    color: colors.textInverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  compareBannerAction: {
    color: colors.textInverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },
  tagFilterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tagFilterList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearTagsButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
  },
  clearTagsText: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  tagFilterChip: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagFilterChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  tagFilterChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  tagFilterChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  propertyCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    position: 'relative',
  },
  propertyCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  compareButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: spacing.sm,
  },
  compareButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  compareButtonText: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '300',
  },
  compareButtonTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  priceContainer: {
    flex: 1,
  },
  propertyPrice: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  originalPrice: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  quickBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  hotBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  hotBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  priceDropBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priceDropBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  domBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  domBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  topLeftBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    flexWrap: 'wrap',
  },
  matchBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  statusTag: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  propertyAddress: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  propertyLocation: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  specItem: {
    alignItems: 'center',
    flex: 1,
  },
  specValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  specLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  specDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  customTag: {
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  customTagText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: colors.textInverse,
    fontWeight: '300',
  },
});
