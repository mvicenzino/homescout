import { create } from 'zustand';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { User, Household, UserType } from '../types';
import {
  demoBuyerUser,
  demoBrokerUser,
  demoHousehold,
  DEMO_BUYER_ID,
  DEMO_BROKER_ID,
} from '../lib/demoData';
import { initializeDemoMode, clearDemoMode } from '../lib/demoMode';

// Required for Google OAuth
WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  user: User | null;
  household: Household | null;
  session: any | null;
  isLoading: boolean;
  isInitialized: boolean;
  isDemoMode: boolean;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string, userType?: UserType) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInAsDemo: (type: 'buyer' | 'broker') => Promise<void>;
  signOut: () => Promise<void>;
  createHousehold: (name: string) => Promise<{ error?: string; inviteCode?: string }>;
  joinHousehold: (inviteCode: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<User>) => Promise<{ error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  household: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  isDemoMode: false,

  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch user profile
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        let household = null;
        if (user?.household_id) {
          const { data: householdData } = await supabase
            .from('households')
            .select('*')
            .eq('id', user.household_id)
            .single();
          household = householdData;
        }

        set({ user, household, session, isLoading: false, isInitialized: true });
      } else {
        set({ user: null, household: null, session: null, isLoading: false, isInitialized: true });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          set({ user: null, household: null, session: null });
        } else if (session?.user) {
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          let household = null;
          if (user?.household_id) {
            const { data: householdData } = await supabase
              .from('households')
              .select('*')
              .eq('id', user.household_id)
              .single();
            household = householdData;
          }

          set({ user, household, session });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  signUp: async (email: string, password: string, name: string, userType: UserType = 'individual') => {
    set({ isLoading: true });

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        set({ isLoading: false });
        return { error: signUpError.message };
      }

      if (data.user) {
        // Create user profile with user_type
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email,
            name,
            user_type: userType,
            preferences: {},
          });

        if (profileError) {
          set({ isLoading: false });
          return { error: profileError.message };
        }

        const user: User = {
          id: data.user.id,
          email,
          name,
          user_type: userType,
          household_id: '',
          preferences: {},
          created_at: new Date().toISOString(),
        };

        set({ user, session: data.session, isLoading: false });
      }

      return {};
    } catch (error: any) {
      set({ isLoading: false });
      return { error: error.message };
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ isLoading: false });
        return { error: error.message };
      }

      if (data.user) {
        let { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // Create user profile if it doesn't exist
        if (!user) {
          const { data: newUser, error: profileError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email || email,
              name: data.user.user_metadata?.full_name || email.split('@')[0],
              user_type: 'individual',
              preferences: {},
            })
            .select()
            .single();

          if (profileError) {
            console.log('Error creating profile:', profileError);
            set({ isLoading: false });
            return { error: 'Failed to create user profile' };
          }
          user = newUser;
        }

        let household = null;
        if (user?.household_id) {
          const { data: householdData } = await supabase
            .from('households')
            .select('*')
            .eq('id', user.household_id)
            .single();
          household = householdData;
        }

        set({ user, household, session: data.session, isLoading: false });
      }

      return {};
    } catch (error: any) {
      set({ isLoading: false });
      return { error: error.message };
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true });

    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'homescout',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        set({ isLoading: false });
        return { error: error.message };
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              set({ isLoading: false });
              return { error: sessionError.message };
            }

            if (sessionData.user) {
              // Check if user profile exists, if not create one
              const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', sessionData.user.id)
                .single();

              let user = existingUser;

              if (!existingUser) {
                const { data: newUser, error: profileError } = await supabase
                  .from('users')
                  .insert({
                    id: sessionData.user.id,
                    email: sessionData.user.email || '',
                    name: sessionData.user.user_metadata?.full_name || sessionData.user.email?.split('@')[0] || 'User',
                    avatar_url: sessionData.user.user_metadata?.avatar_url,
                    user_type: 'individual',
                    preferences: {},
                  })
                  .select()
                  .single();

                if (profileError) {
                  set({ isLoading: false });
                  return { error: profileError.message };
                }
                user = newUser;
              }

              let household = null;
              if (user?.household_id) {
                const { data: householdData } = await supabase
                  .from('households')
                  .select('*')
                  .eq('id', user.household_id)
                  .single();
                household = householdData;
              }

              set({ user, household, session: sessionData.session, isLoading: false });
            }
          }
        } else {
          set({ isLoading: false });
          return { error: 'Google sign-in was cancelled' };
        }
      }

      return {};
    } catch (error: any) {
      set({ isLoading: false });
      return { error: error.message };
    }
  },

  signInAsDemo: async (type: 'buyer' | 'broker') => {
    set({ isLoading: true });

    // Get the appropriate demo user based on type
    const demoUser = type === 'buyer' ? demoBuyerUser : demoBrokerUser;

    // Set the demo user and household
    set({
      user: demoUser,
      household: demoHousehold,
      session: { demo: true },
      isDemoMode: true,
    });

    // Initialize demo data in all stores
    await initializeDemoMode(type);

    set({ isLoading: false });
  },

  signOut: async () => {
    const { isDemoMode } = get();

    if (isDemoMode) {
      // Clear demo data from all stores
      await clearDemoMode();
    } else {
      await supabase.auth.signOut();
    }

    set({ user: null, household: null, session: null, isDemoMode: false });
  },

  createHousehold: async (name: string) => {
    const { user } = get();
    if (!user) return { error: 'Not authenticated' };

    try {
      // Create household
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({ name })
        .select()
        .single();

      if (householdError) {
        return { error: householdError.message };
      }

      // Update user with household_id
      const { error: userError } = await supabase
        .from('users')
        .update({ household_id: household.id })
        .eq('id', user.id);

      if (userError) {
        return { error: userError.message };
      }

      set({
        household,
        user: { ...user, household_id: household.id },
      });

      return { inviteCode: household.invite_code };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  joinHousehold: async (inviteCode: string) => {
    const { user } = get();
    if (!user) return { error: 'Not authenticated' };

    try {
      // Find household by invite code
      const { data: household, error: findError } = await supabase
        .from('households')
        .select('*')
        .eq('invite_code', inviteCode.toLowerCase())
        .single();

      if (findError || !household) {
        return { error: 'Invalid invite code' };
      }

      // Update user with household_id
      const { error: userError } = await supabase
        .from('users')
        .update({ household_id: household.id })
        .eq('id', user.id);

      if (userError) {
        return { error: userError.message };
      }

      set({
        household,
        user: { ...user, household_id: household.id },
      });

      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    const { user } = get();
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        return { error: error.message };
      }

      set({ user: { ...user, ...updates } });
      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  },
}));
