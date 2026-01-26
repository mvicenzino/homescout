import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Card, Button } from '../components/ui';
import { DemoBanner } from '../components/DemoBanner';
import { usePropertyStore } from '../store/propertyStore';
import { useAuthStore } from '../store/authStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { formatCurrency } from '../lib/formatters';
import { Showing, Client } from '../types';

type ShowingFilter = 'upcoming' | 'past' | 'all';

export function ShowingsScreen() {
  const navigation = useNavigation<any>();
  const { properties } = usePropertyStore();
  const { user, isDemoMode } = useAuthStore();

  const [showings, setShowings] = useState<Showing[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<ShowingFilter>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShowing, setEditingShowing] = useState<Showing | null>(null);

  const [form, setForm] = useState({
    property_id: '',
    client_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: '30',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const showingsData = await AsyncStorage.getItem('showings');
      if (showingsData) setShowings(JSON.parse(showingsData));

      const clientsData = await AsyncStorage.getItem('clients');
      if (clientsData) setClients(JSON.parse(clientsData));
    } catch (error) {
      console.error('Error loading showings:', error);
    }
    setIsLoading(false);
  };

  const saveShowing = async () => {
    if (!form.property_id || !form.scheduled_date || !form.scheduled_time) {
      Alert.alert('Error', 'Please fill in property, date, and time');
      return;
    }

    const newShowing: Showing = {
      id: editingShowing?.id || Date.now().toString(),
      property_id: form.property_id,
      client_id: form.client_id || undefined,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time,
      duration_minutes: parseInt(form.duration_minutes) || 30,
      status: editingShowing?.status || 'scheduled',
      notes: form.notes || undefined,
      created_by: user?.id || '',
      created_at: editingShowing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedShowings = editingShowing
      ? showings.map((s) => (s.id === editingShowing.id ? newShowing : s))
      : [...showings, newShowing];

    setShowings(updatedShowings);
    await AsyncStorage.setItem('showings', JSON.stringify(updatedShowings));

    setShowModal(false);
    setEditingShowing(null);
    resetForm();
  };

  const updateShowingStatus = async (showingId: string, status: Showing['status']) => {
    const updatedShowings = showings.map((s) =>
      s.id === showingId ? { ...s, status, updated_at: new Date().toISOString() } : s
    );
    setShowings(updatedShowings);
    await AsyncStorage.setItem('showings', JSON.stringify(updatedShowings));
  };

  const deleteShowing = async (showingId: string) => {
    Alert.alert('Delete Showing', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedShowings = showings.filter((s) => s.id !== showingId);
          setShowings(updatedShowings);
          await AsyncStorage.setItem('showings', JSON.stringify(updatedShowings));
        },
      },
    ]);
  };

  const resetForm = () => {
    setForm({
      property_id: '',
      client_id: '',
      scheduled_date: '',
      scheduled_time: '',
      duration_minutes: '30',
      notes: '',
    });
  };

  const filteredShowings = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return showings
      .filter((s) => {
        const showingDate = new Date(s.scheduled_date);
        showingDate.setHours(0, 0, 0, 0);

        if (filter === 'upcoming') {
          return showingDate >= now && s.status === 'scheduled';
        } else if (filter === 'past') {
          return showingDate < now || s.status !== 'scheduled';
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduled_date + 'T' + a.scheduled_time);
        const dateB = new Date(b.scheduled_date + 'T' + b.scheduled_time);
        return filter === 'past' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      });
  }, [showings, filter]);

  const getStatusColor = (status: Showing['status']) => {
    switch (status) {
      case 'scheduled':
        return colors.primary;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.textMuted;
      case 'no_show':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  return (
    <View style={styles.container}>
      <DemoBanner />
      <SafeAreaView style={styles.innerContainer} edges={isDemoMode ? ['bottom'] : ['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Showings</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setEditingShowing(null);
            setShowModal(true);
          }}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {(['upcoming', 'past', 'all'] as ShowingFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Showings List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}
      >
        {filteredShowings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No {filter} showings</Text>
            <Text style={styles.emptySubtext}>
              Schedule a showing to see your appointments here
            </Text>
          </View>
        ) : (
          filteredShowings.map((showing) => {
            const property = properties.find((p) => p.id === showing.property_id);
            const client = clients.find((c) => c.id === showing.client_id);

            return (
              <Card key={showing.id} style={styles.showingCard}>
                <View style={styles.showingHeader}>
                  <View style={styles.showingDateTime}>
                    <Text style={styles.showingDate}>
                      {new Date(showing.scheduled_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.showingTime}>{showing.scheduled_time}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(showing.status) + '20' },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: getStatusColor(showing.status) }]}>
                      {showing.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    property &&
                    navigation.navigate('Home', {
                      screen: 'PropertyDetail',
                      params: { propertyId: property.id },
                    })
                  }
                >
                  <Text style={styles.propertyAddress}>{property?.address || 'Unknown Property'}</Text>
                  <Text style={styles.propertyDetails}>
                    {property ? `${formatCurrency(property.price)} • ${property.beds}bd ${property.baths}ba` : ''}
                  </Text>
                </TouchableOpacity>

                {client && (
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientLabel}>Client:</Text>
                    <Text style={styles.clientName}>{client.name}</Text>
                  </View>
                )}

                {showing.notes && <Text style={styles.showingNotes}>{showing.notes}</Text>}

                {showing.status === 'scheduled' && (
                  <View style={styles.showingActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => updateShowingStatus(showing.id, 'completed')}
                    >
                      <Text style={styles.actionButtonText}>Mark Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => updateShowingStatus(showing.id, 'cancelled')}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.textMuted }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setEditingShowing(showing);
                        setForm({
                          property_id: showing.property_id,
                          client_id: showing.client_id || '',
                          scheduled_date: showing.scheduled_date,
                          scheduled_time: showing.scheduled_time,
                          duration_minutes: showing.duration_minutes.toString(),
                          notes: showing.notes || '',
                        });
                        setShowModal(true);
                      }}
                    >
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {showing.status !== 'scheduled' && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteShowing(showing.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
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
              {editingShowing ? 'Edit Showing' : 'Schedule Showing'}
            </Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Property *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.propertyPicker}>
                  {properties.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.propertyOption,
                        form.property_id === p.id && styles.propertyOptionActive,
                      ]}
                      onPress={() => setForm({ ...form, property_id: p.id })}
                    >
                      <Text
                        style={[
                          styles.propertyOptionText,
                          form.property_id === p.id && styles.propertyOptionTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {p.address}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Client (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.propertyPicker}>
                  <TouchableOpacity
                    style={[styles.propertyOption, !form.client_id && styles.propertyOptionActive]}
                    onPress={() => setForm({ ...form, client_id: '' })}
                  >
                    <Text
                      style={[
                        styles.propertyOptionText,
                        !form.client_id && styles.propertyOptionTextActive,
                      ]}
                    >
                      No Client
                    </Text>
                  </TouchableOpacity>
                  {clients.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.propertyOption,
                        form.client_id === c.id && styles.propertyOptionActive,
                      ]}
                      onPress={() => setForm({ ...form, client_id: c.id })}
                    >
                      <Text
                        style={[
                          styles.propertyOptionText,
                          form.client_id === c.id && styles.propertyOptionTextActive,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.formLabel}>Date *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  value={form.scheduled_date}
                  onChangeText={(v) => setForm({ ...form, scheduled_date: v })}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Time *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="10:00 AM"
                  value={form.scheduled_time}
                  onChangeText={(v) => setForm({ ...form, scheduled_time: v })}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Duration (minutes)</Text>
              <View style={styles.durationPicker}>
                {['15', '30', '45', '60'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.durationOption,
                      form.duration_minutes === d && styles.durationOptionActive,
                    ]}
                    onPress={() => setForm({ ...form, duration_minutes: d })}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        form.duration_minutes === d && styles.durationTextActive,
                      ]}
                    >
                      {d}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder="Add notes about this showing..."
                value={form.notes}
                onChangeText={(v) => setForm({ ...form, notes: v })}
                multiline
                numberOfLines={3}
              />
            </View>

            <Button
              title={editingShowing ? 'Update Showing' : 'Schedule Showing'}
              onPress={saveShowing}
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
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  showingCard: {
    marginBottom: spacing.md,
  },
  showingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  showingDateTime: {},
  showingDate: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  showingTime: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
  propertyAddress: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  propertyDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clientInfo: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clientLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  clientName: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  showingNotes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  showingActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  actionButton: {
    paddingVertical: spacing.xs,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  deleteButton: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    color: colors.error,
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
  propertyPicker: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  propertyOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    maxWidth: 200,
  },
  propertyOptionActive: {
    backgroundColor: colors.primary,
  },
  propertyOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  propertyOptionTextActive: {
    color: colors.textInverse,
    fontWeight: fontWeight.medium,
  },
  durationPicker: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  durationOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  durationOptionActive: {
    backgroundColor: colors.primary,
  },
  durationText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  durationTextActive: {
    color: colors.textInverse,
    fontWeight: fontWeight.medium,
  },
  saveButton: {
    marginTop: spacing.md,
  },
});
