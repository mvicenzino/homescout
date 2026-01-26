import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Card, Button } from '../components/ui';
import { DemoBanner } from '../components/DemoBanner';
import { useAuthStore } from '../store/authStore';
import { useClientStore, propertyMatchesClient } from '../store/clientStore';
import { usePropertyStore } from '../store/propertyStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { formatCurrency } from '../lib/formatters';
import { calculateLeadScore } from '../lib/leadScoring';
import { Client, ClientPropertyStatus } from '../types';

type ClientFilter = 'active' | 'all';

const statusLabels: Record<ClientPropertyStatus, string> = {
  interested: 'Interested',
  shown: 'Shown',
  rejected: 'Rejected',
  offer_made: 'Offer Made',
  closed: 'Closed',
};

const statusColors: Record<ClientPropertyStatus, string> = {
  interested: colors.primary,
  shown: colors.primaryLight,
  rejected: colors.error,
  offer_made: colors.warning,
  closed: colors.success,
};

export function ClientsScreen() {
  const navigation = useNavigation();
  const { user, household } = useAuthStore();
  const {
    clients,
    isLoading,
    fetchClients,
    addClient,
    updateClient,
    deleteClient,
    unlinkPropertyFromClient,
    updateClientProperty,
    subscribeToChanges,
  } = useClientStore();
  const { properties } = usePropertyStore();

  const [filter, setFilter] = useState<ClientFilter>('active');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    budget_min: '',
    budget_max: '',
    preferred_beds: '',
    preferred_baths: '',
    preferred_locations: '',
    timeline: '',
    pre_approved: false,
    pre_approval_amount: '',
    notes: '',
  });

  const { isDemoMode } = useAuthStore();

  useEffect(() => {
    // Don't fetch from Supabase in demo mode - demo data is already loaded
    if (!isDemoMode) {
      fetchClients();

      if (household?.id) {
        const unsubscribe = subscribeToChanges(household.id);
        return unsubscribe;
      }
    }
  }, [household?.id, isDemoMode]);

  const handleSaveClient = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Please enter a client name');
      return;
    }

    const clientData = {
      name: form.name.trim(),
      email: form.email || undefined,
      phone: form.phone || undefined,
      status: editingClient?.status || 'active' as const,
      source: form.source || undefined,
      budget_min: form.budget_min ? parseInt(form.budget_min) : undefined,
      budget_max: form.budget_max ? parseInt(form.budget_max) : undefined,
      preferred_beds: form.preferred_beds ? parseInt(form.preferred_beds) : undefined,
      preferred_baths: form.preferred_baths ? parseFloat(form.preferred_baths) : undefined,
      preferred_locations: form.preferred_locations
        ? form.preferred_locations.split(',').map((l) => l.trim()).filter(Boolean)
        : undefined,
      timeline: form.timeline || undefined,
      pre_approved: form.pre_approved,
      pre_approval_amount: form.pre_approval_amount ? parseInt(form.pre_approval_amount) : undefined,
      notes: form.notes || undefined,
      created_by: user?.id || '',
    };

    let result;
    if (editingClient) {
      result = await updateClient(editingClient.id, clientData);
    } else {
      result = await addClient(clientData);
    }

    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }

    setShowModal(false);
    setEditingClient(null);
    resetForm();
  };

  const handleUpdateClientStatus = async (clientId: string, status: Client['status']) => {
    const result = await updateClient(clientId, { status });
    if (result.error) {
      Alert.alert('Error', result.error);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    Alert.alert('Delete Client', 'Are you sure? This will also remove all property links.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteClient(clientId);
          if (result.error) {
            Alert.alert('Error', result.error);
          }
        },
      },
    ]);
  };

  const handleUnlinkProperty = async (clientId: string, propertyId: string) => {
    const result = await unlinkPropertyFromClient(clientId, propertyId);
    if (result.error) {
      Alert.alert('Error', result.error);
    }
  };

  const handleUpdatePropertyStatus = async (clientId: string, propertyId: string, status: ClientPropertyStatus) => {
    const result = await updateClientProperty(clientId, propertyId, { status });
    if (result.error) {
      Alert.alert('Error', result.error);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      phone: '',
      source: '',
      budget_min: '',
      budget_max: '',
      preferred_beds: '',
      preferred_baths: '',
      preferred_locations: '',
      timeline: '',
      pre_approved: false,
      pre_approval_amount: '',
      notes: '',
    });
  };

  const filteredClients = clients.filter((c) =>
    filter === 'active' ? c.status === 'active' : true
  );

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.textMuted;
      case 'closed':
        return colors.primary;
      default:
        return colors.textMuted;
    }
  };

  // Get matching properties count for a client
  const getMatchingPropertiesCount = (client: Client) => {
    return properties.filter((p) => {
      const { matches } = propertyMatchesClient(p, client);
      return matches;
    }).length;
  };

  return (
    <View style={styles.container}>
      <DemoBanner />
      <SafeAreaView style={styles.innerContainer} edges={isDemoMode ? ['bottom'] : ['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Clients</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setEditingClient(null);
            setShowModal(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {(['active', 'all'] as ClientFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'active' ? 'Active' : 'All Clients'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {clients.filter((c) => c.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {clients.filter((c) => c.pre_approved).length}
          </Text>
          <Text style={styles.statLabel}>Pre-Approved</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {clients.filter((c) => c.status === 'closed').length}
          </Text>
          <Text style={styles.statLabel}>Closed</Text>
        </View>
      </View>

      {/* Client List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => !isDemoMode && fetchClients()} />}
      >
        {filteredClients.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No clients yet</Text>
            <Text style={styles.emptySubtext}>Add clients to track their preferences</Text>
          </View>
        ) : (
          filteredClients.map((client) => {
            const leadScore = calculateLeadScore(client);
            return (
            <Card key={client.id} style={styles.clientCard}>
              <TouchableOpacity
                onPress={() =>
                  setExpandedClientId(expandedClientId === client.id ? null : client.id)
                }
              >
                <View style={styles.clientHeader}>
                  <View style={styles.clientHeaderLeft}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    {client.timeline && (
                      <Text style={styles.clientTimeline}>Timeline: {client.timeline}</Text>
                    )}
                  </View>
                  <View style={styles.clientHeaderRight}>
                    {/* Lead Score Badge */}
                    <View
                      style={[
                        styles.leadScoreBadge,
                        { backgroundColor: leadScore.bgColor },
                      ]}
                    >
                      <Text style={[styles.leadScoreText, { color: leadScore.color }]}>
                        {leadScore.grade} · {leadScore.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(client.status) + '20' },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: getStatusColor(client.status) }]}>
                        {client.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Budget */}
                {(client.budget_min || client.budget_max) && (
                  <Text style={styles.clientBudget}>
                    Budget: {client.budget_min ? formatCurrency(client.budget_min) : '$0'} -{' '}
                    {client.budget_max ? formatCurrency(client.budget_max) : 'No max'}
                  </Text>
                )}

                {/* Pre-approval & Property Count Row */}
                <View style={styles.badgeRow}>
                  {client.pre_approved && (
                    <View style={styles.preApproved}>
                      <Text style={styles.preApprovedText}>
                        Pre-Approved
                        {client.pre_approval_amount
                          ? ` ${formatCurrency(client.pre_approval_amount)}`
                          : ''}
                      </Text>
                    </View>
                  )}
                  {(client.linked_properties?.length || 0) > 0 && (
                    <View style={styles.propertyCountBadge}>
                      <Text style={styles.propertyCountText}>
                        {client.linked_properties?.length} {client.linked_properties?.length === 1 ? 'property' : 'properties'}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Expanded Details */}
              {expandedClientId === client.id && (
                <View style={styles.expandedContent}>
                  {/* Contact Info */}
                  <View style={styles.contactSection}>
                    {client.email && (
                      <TouchableOpacity
                        style={styles.contactItem}
                        onPress={() => Linking.openURL(`mailto:${client.email}`)}
                      >
                        <Text style={styles.contactIcon}>📧</Text>
                        <Text style={styles.contactText}>{client.email}</Text>
                      </TouchableOpacity>
                    )}
                    {client.phone && (
                      <TouchableOpacity
                        style={styles.contactItem}
                        onPress={() => Linking.openURL(`tel:${client.phone}`)}
                      >
                        <Text style={styles.contactIcon}>📞</Text>
                        <Text style={styles.contactText}>{client.phone}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Preferences */}
                  <View style={styles.preferencesSection}>
                    {(client.preferred_beds || client.preferred_baths) && (
                      <Text style={styles.preferenceText}>
                        Looking for: {client.preferred_beds || '?'}bd / {client.preferred_baths || '?'}ba
                      </Text>
                    )}
                    {client.preferred_locations && client.preferred_locations.length > 0 && (
                      <Text style={styles.preferenceText}>
                        Areas: {client.preferred_locations.join(', ')}
                      </Text>
                    )}
                    {client.source && (
                      <Text style={styles.preferenceText}>Source: {client.source}</Text>
                    )}
                    <Text style={styles.matchText}>
                      {getMatchingPropertiesCount(client)} matching properties in your listings
                    </Text>
                  </View>

                  {/* Notes */}
                  {client.notes && <Text style={styles.clientNotes}>{client.notes}</Text>}

                  {/* Linked Properties */}
                  {client.linked_properties && client.linked_properties.length > 0 && (
                    <View style={styles.linkedPropertiesSection}>
                      <Text style={styles.linkedPropertiesTitle}>Linked Properties</Text>
                      {client.linked_properties.map((lp) => (
                        <View key={lp.id} style={styles.linkedPropertyCard}>
                          <View style={styles.linkedPropertyHeader}>
                            <TouchableOpacity
                              style={styles.linkedPropertyInfo}
                              onPress={() => {
                                // Navigate to property detail
                                (navigation as any).navigate('Home', {
                                  screen: 'PropertyDetail',
                                  params: { propertyId: lp.property_id },
                                });
                              }}
                            >
                              <Text style={styles.linkedPropertyAddress} numberOfLines={1}>
                                {lp.property?.address || 'Unknown Property'}
                              </Text>
                              {lp.property?.price && (
                                <Text style={styles.linkedPropertyPrice}>
                                  {formatCurrency(lp.property.price)}
                                </Text>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleUnlinkProperty(client.id, lp.property_id)}
                              style={styles.unlinkButton}
                            >
                              <Text style={styles.unlinkButtonText}>✕</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Status Selector */}
                          <View style={styles.propertyStatusRow}>
                            {(['interested', 'shown', 'offer_made', 'closed'] as ClientPropertyStatus[]).map((status) => (
                              <TouchableOpacity
                                key={status}
                                style={[
                                  styles.propertyStatusOption,
                                  lp.status === status && { backgroundColor: statusColors[status] + '20', borderColor: statusColors[status] },
                                ]}
                                onPress={() => handleUpdatePropertyStatus(client.id, lp.property_id, status)}
                              >
                                <Text style={[
                                  styles.propertyStatusText,
                                  lp.status === status && { color: statusColors[status] },
                                ]}>
                                  {statusLabels[status]}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          {lp.feedback && (
                            <Text style={styles.linkedPropertyFeedback}>{lp.feedback}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.clientActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        setEditingClient(client);
                        setForm({
                          name: client.name,
                          email: client.email || '',
                          phone: client.phone || '',
                          source: client.source || '',
                          budget_min: client.budget_min?.toString() || '',
                          budget_max: client.budget_max?.toString() || '',
                          preferred_beds: client.preferred_beds?.toString() || '',
                          preferred_baths: client.preferred_baths?.toString() || '',
                          preferred_locations: client.preferred_locations?.join(', ') || '',
                          timeline: client.timeline || '',
                          pre_approved: client.pre_approved || false,
                          pre_approval_amount: client.pre_approval_amount?.toString() || '',
                          notes: client.notes || '',
                        });
                        setShowModal(true);
                      }}
                    >
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>

                    {client.status === 'active' && (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleUpdateClientStatus(client.id, 'closed')}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.success }]}>
                          Mark Closed
                        </Text>
                      </TouchableOpacity>
                    )}

                    {client.status !== 'active' && (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleUpdateClientStatus(client.id, 'active')}
                      >
                        <Text style={styles.actionBtnText}>Reactivate</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDeleteClient(client.id)}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Card>
          );
          })
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingClient ? 'Edit Client' : 'Add Client'}
            </Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Client name"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="email@example.com"
                  value={form.email}
                  onChangeText={(v) => setForm({ ...form, email: v })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Phone</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChangeText={(v) => setForm({ ...form, phone: v })}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.formLabel}>Min Budget</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="300000"
                  value={form.budget_min}
                  onChangeText={(v) => setForm({ ...form, budget_min: v.replace(/[^0-9]/g, '') })}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Max Budget</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="500000"
                  value={form.budget_max}
                  onChangeText={(v) => setForm({ ...form, budget_max: v.replace(/[^0-9]/g, '') })}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.formLabel}>Beds</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="3"
                  value={form.preferred_beds}
                  onChangeText={(v) => setForm({ ...form, preferred_beds: v })}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Baths</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="2"
                  value={form.preferred_baths}
                  onChangeText={(v) => setForm({ ...form, preferred_baths: v })}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Preferred Locations</Text>
              <TextInput
                style={styles.formInput}
                placeholder="City A, City B, Neighborhood"
                value={form.preferred_locations}
                onChangeText={(v) => setForm({ ...form, preferred_locations: v })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Timeline</Text>
              <View style={styles.timelinePicker}>
                {['ASAP', '1-3 months', '3-6 months', '6+ months'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.timelineOption,
                      form.timeline === t && styles.timelineOptionActive,
                    ]}
                    onPress={() => setForm({ ...form, timeline: t })}
                  >
                    <Text
                      style={[
                        styles.timelineText,
                        form.timeline === t && styles.timelineTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setForm({ ...form, pre_approved: !form.pre_approved })}
              >
                <View style={[styles.checkbox, form.pre_approved && styles.checkboxChecked]}>
                  {form.pre_approved && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Pre-Approved for financing</Text>
              </TouchableOpacity>

              {form.pre_approved && (
                <TextInput
                  style={[styles.formInput, { marginTop: spacing.sm }]}
                  placeholder="Pre-approval amount"
                  value={form.pre_approval_amount}
                  onChangeText={(v) =>
                    setForm({ ...form, pre_approval_amount: v.replace(/[^0-9]/g, '') })
                  }
                  keyboardType="number-pad"
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Lead Source</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Referral, Website, Zillow..."
                value={form.source}
                onChangeText={(v) => setForm({ ...form, source: v })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder="Additional notes about this client..."
                value={form.notes}
                onChangeText={(v) => setForm({ ...form, notes: v })}
                multiline
                numberOfLines={3}
              />
            </View>

            <Button
              title={editingClient ? 'Update Client' : 'Add Client'}
              onPress={handleSaveClient}
              fullWidth
              style={styles.saveButton}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    color: colors.textInverse,
    fontWeight: fontWeight.semibold,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  filterTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  filterTabText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  clientCard: {
    marginBottom: spacing.md,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientHeaderLeft: {
    flex: 1,
  },
  clientHeaderRight: {
    marginLeft: spacing.sm,
  },
  clientName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  clientTimeline: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  leadScoreBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  leadScoreText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  clientBudget: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  preApproved: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  preApprovedText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  propertyCountBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  propertyCountText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contactSection: {
    marginBottom: spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  contactIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  contactText: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
  preferencesSection: {
    marginBottom: spacing.md,
  },
  preferenceText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  matchText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
  clientNotes: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  linkedPropertiesSection: {
    marginBottom: spacing.md,
  },
  linkedPropertiesTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  linkedPropertyCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  linkedPropertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkedPropertyInfo: {
    flex: 1,
  },
  linkedPropertyAddress: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  linkedPropertyPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unlinkButton: {
    padding: spacing.xs,
  },
  unlinkButtonText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  propertyStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  propertyStatusOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  propertyStatusText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  linkedPropertyFeedback: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  clientActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    paddingVertical: spacing.xs,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  modalCancel: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    backgroundColor: colors.surface,
  },
  formTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
  },
  timelinePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timelineOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  timelineOptionActive: {
    backgroundColor: colors.primary,
  },
  timelineText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  timelineTextActive: {
    color: colors.textInverse,
    fontWeight: fontWeight.medium,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  saveButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
});
