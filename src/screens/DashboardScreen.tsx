import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui';
import { usePropertyStore } from '../store/propertyStore';
import { useAuthStore } from '../store/authStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { formatCurrency } from '../lib/formatters';
import { Showing, Client, Activity } from '../types';

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { properties, isLoading, fetchProperties } = usePropertyStore();
  const { user } = useAuthStore();

  const [showings, setShowings] = useState<Showing[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const showingsData = await AsyncStorage.getItem('showings');
      if (showingsData) setShowings(JSON.parse(showingsData));

      const clientsData = await AsyncStorage.getItem('clients');
      if (clientsData) setClients(JSON.parse(clientsData));

      const activitiesData = await AsyncStorage.getItem('activities');
      if (activitiesData) setActivities(JSON.parse(activitiesData));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalProperties = properties.length;
    const byStatus = {
      interested: properties.filter((p) => p.status === 'interested').length,
      toured: properties.filter((p) => p.status === 'toured').length,
      offer_made: properties.filter((p) => p.status === 'offer_made').length,
      under_contract: properties.filter((p) => p.status === 'under_contract').length,
      rejected: properties.filter((p) => p.status === 'rejected').length,
      purchased: properties.filter((p) => p.status === 'purchased').length,
    };

    const avgPrice =
      properties.length > 0
        ? properties.reduce((sum, p) => sum + p.price, 0) / properties.length
        : 0;

    const priceRange = {
      min: properties.length > 0 ? Math.min(...properties.map((p) => p.price)) : 0,
      max: properties.length > 0 ? Math.max(...properties.map((p) => p.price)) : 0,
    };

    const upcomingShowings = showings.filter(
      (s) => s.status === 'scheduled' && new Date(s.scheduled_date) >= new Date()
    ).length;

    const activeClients = clients.filter((c) => c.status === 'active').length;

    return {
      totalProperties,
      byStatus,
      avgPrice,
      priceRange,
      upcomingShowings,
      activeClients,
    };
  }, [properties, showings, clients]);

  // Get recent activities
  const recentActivities = useMemo(() => {
    return activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [activities]);

  // Get upcoming showings
  const upcomingShowingsList = useMemo(() => {
    return showings
      .filter((s) => s.status === 'scheduled' && new Date(s.scheduled_date) >= new Date())
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
      .slice(0, 3);
  }, [showings]);

  const StatCard = ({
    title,
    value,
    subtitle,
    color = colors.primary,
    onPress,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              fetchProperties();
              loadData();
            }}
          />
        }
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Properties"
            value={stats.totalProperties}
            color={colors.primary}
            onPress={() => navigation.navigate('Home')}
          />
          <StatCard
            title="Active Pipeline"
            value={stats.byStatus.interested + stats.byStatus.toured + stats.byStatus.offer_made}
            subtitle="In progress"
            color={colors.warning}
          />
          <StatCard
            title="Showings"
            value={stats.upcomingShowings}
            subtitle="Upcoming"
            color="#8B5CF6"
          />
          <StatCard
            title="Clients"
            value={stats.activeClients}
            subtitle="Active"
            color={colors.success}
          />
        </View>

        {/* Pipeline Overview */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Pipeline Overview</Text>
          <View style={styles.pipeline}>
            <View style={styles.pipelineItem}>
              <View style={[styles.pipelineDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.pipelineLabel}>Interested</Text>
              <Text style={styles.pipelineCount}>{stats.byStatus.interested}</Text>
            </View>
            <View style={styles.pipelineItem}>
              <View style={[styles.pipelineDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={styles.pipelineLabel}>Toured</Text>
              <Text style={styles.pipelineCount}>{stats.byStatus.toured}</Text>
            </View>
            <View style={styles.pipelineItem}>
              <View style={[styles.pipelineDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.pipelineLabel}>Offer Made</Text>
              <Text style={styles.pipelineCount}>{stats.byStatus.offer_made}</Text>
            </View>
            <View style={styles.pipelineItem}>
              <View style={[styles.pipelineDot, { backgroundColor: colors.success }]} />
              <Text style={styles.pipelineLabel}>Under Contract</Text>
              <Text style={styles.pipelineCount}>{stats.byStatus.under_contract}</Text>
            </View>
            <View style={styles.pipelineItem}>
              <View style={[styles.pipelineDot, { backgroundColor: '#059669' }]} />
              <Text style={styles.pipelineLabel}>Purchased</Text>
              <Text style={styles.pipelineCount}>{stats.byStatus.purchased}</Text>
            </View>
          </View>
        </Card>

        {/* Price Analysis */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Price Analysis</Text>
          <View style={styles.priceStats}>
            <View style={styles.priceStat}>
              <Text style={styles.priceLabel}>Average Price</Text>
              <Text style={styles.priceValue}>{formatCurrency(stats.avgPrice)}</Text>
            </View>
            <View style={styles.priceStat}>
              <Text style={styles.priceLabel}>Price Range</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(stats.priceRange.min)} - {formatCurrency(stats.priceRange.max)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Upcoming Showings */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Upcoming Showings</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Showings')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {upcomingShowingsList.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming showings</Text>
          ) : (
            upcomingShowingsList.map((showing) => {
              const property = properties.find((p) => p.id === showing.property_id);
              return (
                <View key={showing.id} style={styles.showingItem}>
                  <View style={styles.showingDate}>
                    <Text style={styles.showingDay}>
                      {new Date(showing.scheduled_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                      })}
                    </Text>
                    <Text style={styles.showingDateNum}>
                      {new Date(showing.scheduled_date).getDate()}
                    </Text>
                  </View>
                  <View style={styles.showingDetails}>
                    <Text style={styles.showingAddress} numberOfLines={1}>
                      {property?.address || 'Unknown Property'}
                    </Text>
                    <Text style={styles.showingTime}>{showing.scheduled_time}</Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Recent Activity */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          {recentActivities.length === 0 ? (
            <Text style={styles.emptyText}>No recent activity</Text>
          ) : (
            recentActivities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Text style={styles.activityEmoji}>
                    {activity.type === 'property_added'
                      ? '🏠'
                      : activity.type === 'status_changed'
                      ? '📊'
                      : activity.type === 'showing_scheduled'
                      ? '📅'
                      : activity.type === 'offer_made'
                      ? '💰'
                      : '📝'}
                  </Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  <Text style={styles.activityTime}>
                    {new Date(activity.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Home', { screen: 'AddProperty' })}
            >
              <Text style={styles.quickActionIcon}>+</Text>
              <Text style={styles.quickActionLabel}>Add Property</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Showings')}
            >
              <Text style={styles.quickActionIcon}>📅</Text>
              <Text style={styles.quickActionLabel}>Schedule Showing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Clients')}
            >
              <Text style={styles.quickActionIcon}>👥</Text>
              <Text style={styles.quickActionLabel}>Manage Clients</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Compare')}
            >
              <Text style={styles.quickActionIcon}>⚖️</Text>
              <Text style={styles.quickActionLabel}>Compare</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  statTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  pipeline: {
    gap: spacing.sm,
  },
  pipelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  pipelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  pipelineLabel: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  pipelineCount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  priceStats: {
    gap: spacing.md,
  },
  priceStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  showingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  showingDate: {
    width: 50,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  showingDay: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  showingDateNum: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  showingDetails: {
    flex: 1,
  },
  showingAddress: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  showingTime: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  activityEmoji: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  activityTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  quickActionLabel: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
