import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  Property,
  PropertyPhoto,
  PropertyRating,
  PropertyNote,
  PropertyTag,
  PropertyStatus,
  PropertyWithRatings,
  NoteType,
} from '../types';

interface PropertyState {
  properties: Property[];
  isLoading: boolean;
  error: string | null;
  selectedPropertyIds: string[]; // For comparison

  // Actions
  fetchProperties: () => Promise<void>;
  addProperty: (property: Omit<Property, 'id' | 'created_at' | 'updated_at'>) => Promise<{ error?: string; property?: Property }>;
  updateProperty: (id: string, updates: Partial<Property>) => Promise<{ error?: string }>;
  deleteProperty: (id: string) => Promise<{ error?: string }>;
  updatePropertyStatus: (id: string, status: PropertyStatus) => Promise<{ error?: string }>;

  // Photos
  addPhoto: (propertyId: string, url: string, caption?: string, isPrimary?: boolean) => Promise<{ error?: string }>;
  deletePhoto: (photoId: string) => Promise<{ error?: string }>;

  // Ratings
  setRating: (propertyId: string, rating: number) => Promise<{ error?: string }>;

  // Notes
  addNote: (propertyId: string, content: string, type: NoteType) => Promise<{ error?: string }>;
  deleteNote: (noteId: string) => Promise<{ error?: string }>;

  // Tags
  addTag: (propertyId: string, tag: string) => Promise<{ error?: string }>;
  removeTag: (propertyId: string, tag: string) => Promise<{ error?: string }>;

  // Comparison
  togglePropertySelection: (propertyId: string) => void;
  clearSelection: () => void;

  // Real-time
  subscribeToChanges: (householdId: string) => () => void;
}

export const usePropertyStore = create<PropertyState>()(
  persist(
    (set, get) => ({
      properties: [],
      isLoading: false,
      error: null,
      selectedPropertyIds: [],

      fetchProperties: async () => {
        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase
            .from('properties')
            .select(`
              *,
              photos:property_photos(*),
              ratings:property_ratings(*),
              notes:property_notes(*),
              tags:property_tags(*)
            `)
            .order('created_at', { ascending: false });

          if (error) {
            set({ error: error.message, isLoading: false });
            return;
          }

          set({ properties: data || [], isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      addProperty: async (property) => {
        try {
          const { data, error } = await supabase
            .from('properties')
            .insert(property)
            .select()
            .single();

          if (error) {
            return { error: error.message };
          }

          const newProperty = { ...data, photos: [], ratings: [], notes: [], tags: [] };
          set((state) => ({
            properties: [newProperty, ...state.properties],
          }));

          return { property: newProperty };
        } catch (error: any) {
          return { error: error.message };
        }
      },

      updateProperty: async (id, updates) => {
        try {
          const { error } = await supabase
            .from('properties')
            .update(updates)
            .eq('id', id);

          if (error) {
            return { error: error.message };
          }

          set((state) => ({
            properties: state.properties.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      deleteProperty: async (id) => {
        try {
          const { error } = await supabase
            .from('properties')
            .delete()
            .eq('id', id);

          if (error) {
            return { error: error.message };
          }

          set((state) => ({
            properties: state.properties.filter((p) => p.id !== id),
            selectedPropertyIds: state.selectedPropertyIds.filter((pid) => pid !== id),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      updatePropertyStatus: async (id, status) => {
        return get().updateProperty(id, { status });
      },

      addPhoto: async (propertyId, url, caption, isPrimary = false) => {
        try {
          // Try Supabase first
          const { data, error } = await supabase
            .from('property_photos')
            .insert({ property_id: propertyId, url, caption, is_primary: isPrimary })
            .select()
            .single();

          if (error) {
            // Fallback to local storage if Supabase fails
            console.log('Supabase photo save failed, using local storage:', error.message);
            const localPhoto: PropertyPhoto = {
              id: `local_${Date.now()}`,
              property_id: propertyId,
              url,
              caption,
              is_primary: isPrimary,
              uploaded_by: 'local',
              created_at: new Date().toISOString(),
            };

            set((state) => ({
              properties: state.properties.map((p) =>
                p.id === propertyId
                  ? { ...p, photos: [...(p.photos || []), localPhoto] }
                  : p
              ),
            }));

            // Also save to AsyncStorage for persistence
            const existingPhotos = await AsyncStorage.getItem(`photos_${propertyId}`);
            const photos = existingPhotos ? JSON.parse(existingPhotos) : [];
            photos.push(localPhoto);
            await AsyncStorage.setItem(`photos_${propertyId}`, JSON.stringify(photos));

            return {};
          }

          set((state) => ({
            properties: state.properties.map((p) =>
              p.id === propertyId
                ? { ...p, photos: [...(p.photos || []), data] }
                : p
            ),
          }));

          return {};
        } catch (error: any) {
          // Ultimate fallback - save locally
          console.log('Photo save error, using local fallback:', error.message);
          const localPhoto: PropertyPhoto = {
            id: `local_${Date.now()}`,
            property_id: propertyId,
            url,
            caption,
            is_primary: isPrimary,
            uploaded_by: 'local',
            created_at: new Date().toISOString(),
          };

          set((state) => ({
            properties: state.properties.map((p) =>
              p.id === propertyId
                ? { ...p, photos: [...(p.photos || []), localPhoto] }
                : p
            ),
          }));

          try {
            const existingPhotos = await AsyncStorage.getItem(`photos_${propertyId}`);
            const photos = existingPhotos ? JSON.parse(existingPhotos) : [];
            photos.push(localPhoto);
            await AsyncStorage.setItem(`photos_${propertyId}`, JSON.stringify(photos));
          } catch (e) {
            console.error('Failed to save photo to AsyncStorage:', e);
          }

          return {};
        }
      },

      deletePhoto: async (photoId) => {
        try {
          const { error } = await supabase
            .from('property_photos')
            .delete()
            .eq('id', photoId);

          if (error) {
            return { error: error.message };
          }

          set((state) => ({
            properties: state.properties.map((p) => ({
              ...p,
              photos: p.photos?.filter((photo) => photo.id !== photoId),
            })),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      setRating: async (propertyId, rating) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return { error: 'Not authenticated' };

          // Upsert rating
          const { data, error } = await supabase
            .from('property_ratings')
            .upsert(
              { property_id: propertyId, user_id: user.id, rating },
              { onConflict: 'property_id,user_id' }
            )
            .select()
            .single();

          if (error) {
            return { error: error.message };
          }

          set((state) => ({
            properties: state.properties.map((p) => {
              if (p.id !== propertyId) return p;

              const existingRatings = p.ratings?.filter((r) => r.user_id !== user.id) || [];
              return {
                ...p,
                ratings: [...existingRatings, data],
              };
            }),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      addNote: async (propertyId, content, type) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return { error: 'Not authenticated' };

          const { data, error } = await supabase
            .from('property_notes')
            .insert({ property_id: propertyId, user_id: user.id, content, type })
            .select()
            .single();

          if (error) {
            return { error: error.message };
          }

          set((state) => ({
            properties: state.properties.map((p) =>
              p.id === propertyId
                ? { ...p, notes: [...(p.notes || []), data] }
                : p
            ),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      deleteNote: async (noteId) => {
        try {
          const { error } = await supabase
            .from('property_notes')
            .delete()
            .eq('id', noteId);

          if (error) {
            return { error: error.message };
          }

          set((state) => ({
            properties: state.properties.map((p) => ({
              ...p,
              notes: p.notes?.filter((note) => note.id !== noteId),
            })),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      addTag: async (propertyId, tag) => {
        try {
          const { data, error } = await supabase
            .from('property_tags')
            .insert({ property_id: propertyId, tag })
            .select()
            .single();

          if (error) {
            return { error: error.message };
          }

          set((state) => ({
            properties: state.properties.map((p) =>
              p.id === propertyId
                ? { ...p, tags: [...(p.tags || []), data] }
                : p
            ),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      removeTag: async (propertyId, tag) => {
        try {
          const { error } = await supabase
            .from('property_tags')
            .delete()
            .eq('property_id', propertyId)
            .eq('tag', tag);

          if (error) {
            return { error: error.message };
          }

          set((state) => ({
            properties: state.properties.map((p) =>
              p.id === propertyId
                ? { ...p, tags: p.tags?.filter((t) => t.tag !== tag) }
                : p
            ),
          }));

          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      togglePropertySelection: (propertyId) => {
        set((state) => {
          const isSelected = state.selectedPropertyIds.includes(propertyId);
          if (isSelected) {
            return {
              selectedPropertyIds: state.selectedPropertyIds.filter((id) => id !== propertyId),
            };
          }
          // Limit to 2 properties for comparison
          if (state.selectedPropertyIds.length >= 2) {
            return {
              selectedPropertyIds: [state.selectedPropertyIds[1], propertyId],
            };
          }
          return {
            selectedPropertyIds: [...state.selectedPropertyIds, propertyId],
          };
        });
      },

      clearSelection: () => {
        set({ selectedPropertyIds: [] });
      },

      subscribeToChanges: (householdId) => {
        const channel = supabase
          .channel('property-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'properties',
              filter: `household_id=eq.${householdId}`,
            },
            () => {
              // Refetch all properties on any change
              get().fetchProperties();
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'property_ratings',
            },
            () => {
              get().fetchProperties();
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'property_notes',
            },
            () => {
              get().fetchProperties();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      },
    }),
    {
      name: 'homescout-properties',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ properties: state.properties }),
    }
  )
);

// Selector to get property with ratings for current user
export const getPropertyWithRatings = (
  property: Property,
  currentUserId: string
): PropertyWithRatings => {
  const myRating = property.ratings?.find((r) => r.user_id === currentUserId)?.rating;
  const partnerRating = property.ratings?.find((r) => r.user_id !== currentUserId)?.rating;
  const ratings = property.ratings?.map((r) => r.rating) || [];
  const averageRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : undefined;

  return {
    ...property,
    my_rating: myRating,
    partner_rating: partnerRating,
    average_rating: averageRating,
  };
};

// Selector to check if both partners like a property (rated 4+)
export const weBothLike = (property: Property): boolean => {
  const ratings = property.ratings || [];
  if (ratings.length < 2) return false;
  return ratings.every((r) => r.rating >= 4);
};
