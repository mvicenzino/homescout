import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Path, Rect, Line, Circle } from 'react-native-svg';

import { useAuthStore } from '../store/authStore';
import { usePropertyStore } from '../store/propertyStore';
import { colors } from '../constants/theme';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { OnboardingScreen, hasCompletedOnboarding } from '../screens/auth/OnboardingScreen';

// Main Screens
import { HomeScreen } from '../screens/HomeScreen';
import { PropertyDetailScreen } from '../screens/PropertyDetailScreen';
import { AddPropertyScreen } from '../screens/AddPropertyScreen';
import { CompareScreen } from '../screens/CompareScreen';
import { MapScreen } from '../screens/MapScreen';
import { CalculatorsScreen } from '../screens/CalculatorsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

import {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  HomeStackParamList,
} from '../types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

// Tab bar icons using SVG
function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? colors.primary : colors.textMuted;
  const size = 24;
  const strokeWidth = 2;

  const icons: Record<string, React.ReactNode> = {
    Home: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M9 22V12h6v10"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
    Compare: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="3" width="7" height="18" rx="1" stroke={color} strokeWidth={strokeWidth} />
        <Rect x="14" y="3" width="7" height="18" rx="1" stroke={color} strokeWidth={strokeWidth} />
      </Svg>
    ),
    Map: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={strokeWidth} />
      </Svg>
    ),
    Calculators: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="4" y="2" width="16" height="20" rx="2" stroke={color} strokeWidth={strokeWidth} />
        <Line x1="8" y1="6" x2="16" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Circle cx="8" cy="11" r="1" fill={color} />
        <Circle cx="12" cy="11" r="1" fill={color} />
        <Circle cx="16" cy="11" r="1" fill={color} />
        <Circle cx="8" cy="15" r="1" fill={color} />
        <Circle cx="12" cy="15" r="1" fill={color} />
        <Circle cx="16" cy="15" r="1" fill={color} />
        <Circle cx="8" cy="19" r="1" fill={color} />
        <Circle cx="12" cy="19" r="1" fill={color} />
        <Circle cx="16" cy="19" r="1" fill={color} />
      </Svg>
    ),
    Settings: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
        <Path
          d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
  };

  return <View>{icons[name] || icons.Home}</View>;
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

function HomeNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="PropertyList"
        component={HomeScreen}
        options={{ title: 'Properties' }}
      />
      <HomeStack.Screen
        name="PropertyDetail"
        component={PropertyDetailScreen}
        options={{ title: 'Property Details' }}
      />
      <HomeStack.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={({ route }) => ({
          title: route.params?.propertyId ? 'Edit Property' : 'Add Property',
        })}
      />
    </HomeStack.Navigator>
  );
}

function MainNavigator() {
  const { household } = useAuthStore();
  const { fetchProperties, subscribeToChanges } = usePropertyStore();

  useEffect(() => {
    fetchProperties();

    if (household?.id) {
      const unsubscribe = subscribeToChanges(household.id);
      return unsubscribe;
    }
  }, [household?.id]);

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabBarIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: route.name !== 'Home',
      })}
    >
      <MainTab.Screen
        name="Home"
        component={HomeNavigator}
        options={{ headerShown: false }}
      />
      <MainTab.Screen name="Map" component={MapScreen} />
      <MainTab.Screen name="Compare" component={CompareScreen} />
      <MainTab.Screen name="Calculators" component={CalculatorsScreen} />
      <MainTab.Screen name="Settings" component={SettingsScreen} />
    </MainTab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function Navigation() {
  const { isInitialized, isLoading, user, household, initialize } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    initialize();
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const completed = await hasCompletedOnboarding();
    setShowOnboarding(!completed);
  };

  if (!isInitialized || isLoading || showOnboarding === null) {
    return <LoadingScreen />;
  }

  const isAuthenticated = !!user;

  // Show onboarding for first-time users who aren't authenticated
  if (showOnboarding && !isAuthenticated) {
    return (
      <NavigationContainer>
        <OnboardingScreen
          navigation={{} as any}
          onComplete={() => setShowOnboarding(false)}
        />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
