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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Button } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { formatCurrency } from '../lib/formatters';
import { Client } from '../types';

type ClientFilter = 'active' | 'all';

export function ClientsScreen() {
  const { user } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<ClientFilter>('active');
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await AsyncStorage.getItem('clients');
      if (data) setClients(JSON.parse(data));
    } catch (error) {
      console.error('Error loading clients:', error);
    }
    setIsLoading(false);
  };

  const saveClient = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Please enter a client name');
      return;
    }

    const newClient: Client = {
      id: editingClient?.id || Date.now().toString(),
      name: form.name.trim(),
      email: form.email || undefined,
      phone: form.phone || undefined,
      status: editingClient?.status || 'active',
      source: form.source || undefined,
      budget_min: form.budget_min ? parseInt(form.budget_min) : undefined,
      budget_max: form.budget_max ? parseInt(form.budget_max) : undefined,
      preferred_beds: form.preferred_beds ? parseInt(form.preferred_beds) : undefined,
      preferred_baths: form.preferred_baths ? parseInt(form.preferred_baths) : undefined,
      preferred_locations: form.preferred_locations
        ? form.preferred_locations.split(',').map((l) => l.trim())
        : undefined,
      timeline: form.timeline || undefined,
      pre_approved: form.pre_approved,
      pre_approval_amount: form.pre_approval_amount ? parseInt(form.pre_approval_amount) : undefined,
      notes: form.notes || undefined,
      created_by: user?.id || '',
      created_at: editingClient?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedClients = editingClient
      ? clients.map((c) => (c.id === editingClient.id ? newClient : c))
      : [...clients, newClient];

    setClients(updatedClients);
    await AsyncStorage.setItem('clients', JSON.stringify(updatedClients));

    setShowModal(false);
    setEditingClient(null);
    resetForm();
  };

  const updateClientStatus = async (clientId: string, status: Client['status']) => {
    const updatedClients = clients.map((c) =>
      c.id === clientId ? { ...c, status, updated_at: new Date().toISOString() } : c
    );
    setClients(updatedClients);
    await AsyncStorage.setItem('clients', JSON.stringify(updatedClients));
  };

  const deleteClient = async (clientId: string) => {
    Alert.alert('Delete Client', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedClients = clients.filter((c) => c.id !== clientId);
          setClients(updatedClients);
          await AsyncStorage.setItem('clients', JSON.stringify(updatedClients));
        },
      },
    ]);
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadClients} />}
      >
        {filteredClients.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No clients yet</Text>
            <Text style={styles.emptySubtext}>Add clients to track their preferences</Text>
          </View>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} style={styles.clientCard}>
              <TouchableOpacity
                onPress={() =>
                  setExpandedClientId(expandedClientId === client.id ? null : client.id)
                }
              >
                <View style={styles.clientHeader}>
                  <View>
                    <Text style={styles.clientName}>{client.name}</Text>
                    {client.timeline && (
                      <Text style={styles.clientTimeline}>Timeline: {client.timeline}</Text>
                    )}
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

                {/* Budget */}
                {(client.budget_min || client.budget_max) && (
                  <Text style={styles.clientBudget}>
                    Budget: {client.budget_min ? formatCurrency(client.budget_min) : '$0'} -{' '}
                    {client.budget_max ? formatCurrency(client.budget_max) : 'No max'}
                  </Text>
                )}

                {/* Pre-approval */}
                {client.pre_approved && (
                  <View style={styles.preApproved}>
                    <Text style={styles.preApprovedText}>
                      Pre-Approved
                      {client.pre_approval_amount
                        ? ` up to ${formatCurrency(client.pre_approval_amount)}`
                        : ''}
                    </Text>
                  </View>
                )}
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
                  </View>

                  {/* Notes */}
                  {client.notes && <Text style={styles.clientNotes}>{client.notes}</Text>}

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
                        onPress={() => updateClientStatus(client.id, 'closed')}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.success }]}>
                          Mark Closed
                        </Text>
                      </TouchableOpacity>
                    )}

                    {client.status !== 'active' && (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => updateClientStatus(client.id, 'active')}
                      >
                        <Text style={styles.actionBtnText}>Reactivate</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => deleteClient(client.id)}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Card>
          ))
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
              onPress={saveClient}
              fullWidth
              style={styles.saveButton}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  clientBudget: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  preApproved: {
    marginTop: spacing.sm,
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  preApprovedText: {
    fontSize: fontSize.sm,
    color: colors.success,
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
  clientNotes: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.md,
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
