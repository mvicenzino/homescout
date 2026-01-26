import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Client, ClientProperty, ClientPropertyStatus } from '../types';
import { demoClients } from '../lib/demoData';

interface ClientState {
  clients: Client[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchClients: () => Promise<void>;
  addClient: (client: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'linked_properties'>) => Promise<{ error?: string; client?: Client }>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<{ error?: string }>;
  deleteClient: (id: string) => Promise<{ error?: string }>;

  // Client-Property linking
  linkPropertyToClient: (clientId: string, propertyId: string, status?: ClientPropertyStatus) => Promise<{ error?: string }>;
  unlinkPropertyFromClient: (clientId: string, propertyId: string) => Promise<{ error?: string }>;
  updateClientProperty: (clientId: string, propertyId: string, updates: Partial<ClientProperty>) => Promise<{ error?: string }>;
  getClientsForProperty: (propertyId: string) => Client[];

  // Real-time
  subscribeToChanges: (householdId: string) => () => void;

  // Demo Mode
  loadDemoData: () => void;
  clearDemoData: () => void;
}

export const useClientStore = create<ClientState>()(
  persist(
    (set, get) => ({
      clients: [],
      isLoading: false,
      error: null,

      fetchClients: async () => {
        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase
            .from('clients')
            .select(`
              *,
              linked_properties:client_properties(
                *,
                property:properties(*)
              )
            `)
            .order('created_at', { ascending: false });

          if (error) {
            set({ error: error.message, isLoading: false });
            return;
          }

          set({ clients: data || [], isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      addClient: async (client) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return { error: 'Not authenticated' };

          // Get user's household_id
          const { data: userData } = await supabase
            .from('users')
            .select('household_id')
            .eq('id', user.id)
            .single();

          const { data, error } = await supabase
            .from('clients')
            .insert({
              ...client,
              created_by: user.id,
              household_id: userData?.household_id,
            })
            .select()
            .single();

          if (error) {
            return { error: error.message };
          }

          const newClient = { ...data, linked_properties: [] };
          set((state) => ({
            clients: [newClient, ...state.clients],
          }));

          return { client: newClient };
        } catch (error: any) {
          return { error: error.message };
        }
      },

      updateClient: async (id, updates) => {
        try {
          const { error } = await supabase
            .from('clients')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);

          if (error) {
            return { error: error.message };
          }

          set((state) => ({
            clients: state.clients.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      deleteClient: async (id) => {
        try {
          const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

          if (error) {
            return { error: error.message };
          }

          set((state) => ({
            clients: state.clients.filter((c) => c.id !== id),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      linkPropertyToClient: async (clientId, propertyId, status = 'interested') => {
        try {
          const { data, error } = await supabase
            .from('client_properties')
            .insert({
              client_id: clientId,
              property_id: propertyId,
              status,
            })
            .select(`
              *,
              property:properties(*)
            `)
            .single();

          if (error) {
            // Check if it's a duplicate
            if (error.code === '23505') {
              return { error: 'Property already linked to this client' };
            }
            return { error: error.message };
          }

          set((state) => ({
            clients: state.clients.map((c) =>
              c.id === clientId
                ? { ...c, linked_properties: [...(c.linked_properties || []), data] }
                : c
            ),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      unlinkPropertyFromClient: async (clientId, propertyId) => {
        try {
          const { error } = await supabase
            .from('client_properties')
            .delete()
            .eq('client_id', clientId)
            .eq('property_id', propertyId);

          if (error) {
            return { error: error.message };
          }

          set((state) => ({
            clients: state.clients.map((c) =>
              c.id === clientId
                ? {
                    ...c,
                    linked_properties: c.linked_properties?.filter(
                      (lp) => lp.property_id !== propertyId
                    ),
                  }
                : c
            ),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      updateClientProperty: async (clientId, propertyId, updates) => {
        try {
          const { error } = await supabase
            .from('client_properties')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('client_id', clientId)
            .eq('property_id', propertyId);

          if (error) {
            return { error: error.message };
          }

          set((state) => ({
            clients: state.clients.map((c) =>
              c.id === clientId
                ? {
                    ...c,
                    linked_properties: c.linked_properties?.map((lp) =>
                      lp.property_id === propertyId ? { ...lp, ...updates } : lp
                    ),
                  }
                : c
            ),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      getClientsForProperty: (propertyId) => {
        const { clients } = get();
        return clients.filter((c) =>
          c.linked_properties?.some((lp) => lp.property_id === propertyId)
        );
      },

      subscribeToChanges: (householdId) => {
        const channel = supabase
          .channel('client-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'clients',
              filter: `household_id=eq.${householdId}`,
            },
            () => {
              get().fetchClients();
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'client_properties',
            },
            () => {
              get().fetchClients();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      },

      loadDemoData: () => {
        set({ clients: demoClients, isLoading: false, error: null });
      },

      clearDemoData: () => {
        set({ clients: [] });
      },
    }),
    {
      name: 'homescout-clients',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ clients: state.clients }),
    }
  )
);

// Helper to get client property link status
export const getClientPropertyStatus = (client: Client, propertyId: string): ClientProperty | undefined => {
  return client.linked_properties?.find((lp) => lp.property_id === propertyId);
};

// Helper to check if property matches client preferences
export const propertyMatchesClient = (
  property: { price?: number; beds?: number; baths?: number; city?: string },
  client: Client
): { matches: boolean; reasons: string[] } => {
  const reasons: string[] = [];
  let matches = true;

  // Budget check
  if (client.budget_min && property.price && property.price < client.budget_min) {
    matches = false;
    reasons.push('Below budget');
  }
  if (client.budget_max && property.price && property.price > client.budget_max) {
    matches = false;
    reasons.push('Above budget');
  }
  if (client.budget_min && client.budget_max && property.price &&
      property.price >= client.budget_min && property.price <= client.budget_max) {
    reasons.push('Within budget');
  }

  // Beds check
  if (client.preferred_beds && property.beds && property.beds < client.preferred_beds) {
    matches = false;
    reasons.push(`Needs ${client.preferred_beds}+ beds`);
  } else if (client.preferred_beds && property.beds && property.beds >= client.preferred_beds) {
    reasons.push('Meets bed requirement');
  }

  // Baths check
  if (client.preferred_baths && property.baths && property.baths < client.preferred_baths) {
    matches = false;
    reasons.push(`Needs ${client.preferred_baths}+ baths`);
  } else if (client.preferred_baths && property.baths && property.baths >= client.preferred_baths) {
    reasons.push('Meets bath requirement');
  }

  // Location check
  if (client.preferred_locations && client.preferred_locations.length > 0 && property.city) {
    const cityLower = property.city.toLowerCase();
    const locationMatch = client.preferred_locations.some(
      (loc) => cityLower.includes(loc.toLowerCase()) || loc.toLowerCase().includes(cityLower)
    );
    if (!locationMatch) {
      matches = false;
      reasons.push('Not in preferred location');
    } else {
      reasons.push('In preferred location');
    }
  }

  return { matches, reasons };
};
