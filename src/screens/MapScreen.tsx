import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { usePropertyStore } from '../store/propertyStore';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';
import { Property, HomeStackParamList, MainTabParamList } from '../types';

type MapScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Map'>,
  NativeStackNavigationProp<HomeStackParamList>
>;
import { formatCurrency } from '../lib/formatters';

interface GeocodedProperty extends Property {
  latitude: number;
  longitude: number;
}

interface GeocodingCache {
  [address: string]: { lat: number; lng: number } | null;
}

const geocodingCache: GeocodingCache = {};

async function geocodeAddress(
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<{ lat: number; lng: number } | null> {
  const fullAddress = `${address}, ${city}, ${state} ${zip}`;

  // Check cache first
  if (geocodingCache[fullAddress] !== undefined) {
    return geocodingCache[fullAddress];
  }

  try {
    const query = encodeURIComponent(fullAddress);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          'User-Agent': 'HomeScout/1.0',
        },
      }
    );

    const data = await response.json();

    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      geocodingCache[fullAddress] = result;
      return result;
    }

    geocodingCache[fullAddress] = null;
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

function getMarkerColor(status: Property['status']): string {
  switch (status) {
    case 'interested':
      return colors.primary;
    case 'toured':
      return colors.warning;
    case 'offer_made':
      return '#9333EA'; // purple
    case 'under_contract':
      return colors.success;
    case 'rejected':
      return colors.error;
    case 'purchased':
      return '#10B981'; // green
    default:
      return colors.primary;
  }
}

export function MapScreen() {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const { properties } = usePropertyStore();
  const mapRef = useRef<MapView>(null);

  const [geocodedProperties, setGeocodedProperties] = useState<GeocodedProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<GeocodedProperty | null>(null);

  const geocodeProperties = useCallback(async () => {
    setIsLoading(true);
    const results: GeocodedProperty[] = [];

    // Geocode in batches to avoid rate limiting
    for (const property of properties) {
      const coords = await geocodeAddress(
        property.address,
        property.city,
        property.state,
        property.zip
      );

      if (coords) {
        results.push({
          ...property,
          latitude: coords.lat,
          longitude: coords.lng,
        });
      }

      // Small delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setGeocodedProperties(results);
    setIsLoading(false);

    // Fit map to show all markers
    if (results.length > 0 && mapRef.current) {
      const coordinates = results.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));

      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, [properties]);

  useEffect(() => {
    geocodeProperties();
  }, [geocodeProperties]);

  const handleMarkerPress = (property: GeocodedProperty) => {
    setSelectedProperty(property);
  };

  const handleCalloutPress = (property: GeocodedProperty) => {
    // Navigate to Home tab, then to PropertyDetail within the Home stack
    navigation.navigate('Home', {
      screen: 'PropertyDetail',
      params: { propertyId: property.id },
    } as any);
  };

  const initialRegion: Region = {
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 30,
    longitudeDelta: 30,
  };

  if (properties.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyTitle}>No Properties Yet</Text>
        <Text style={styles.emptySubtitle}>
          Add properties to see them on the map
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {geocodedProperties.map((property) => (
          <Marker
            key={property.id}
            coordinate={{
              latitude: property.latitude,
              longitude: property.longitude,
            }}
            pinColor={getMarkerColor(property.status)}
            onPress={() => handleMarkerPress(property)}
          >
            <Callout onPress={() => handleCalloutPress(property)}>
              <View style={styles.callout}>
                <Text style={styles.calloutPrice}>
                  {formatCurrency(property.price)}
                </Text>
                <Text style={styles.calloutAddress} numberOfLines={1}>
                  {property.address}
                </Text>
                <Text style={styles.calloutDetails}>
                  {property.beds} bed • {property.baths} bath • {property.sqft.toLocaleString()} sqft
                </Text>
                <Text style={styles.calloutTap}>Tap for details →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading property locations...</Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Status</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendLabel}>Interested</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendLabel}>Toured</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9333EA' }]} />
            <Text style={styles.legendLabel}>Offer</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendLabel}>Contract</Text>
          </View>
        </View>
      </View>

      {/* Property count */}
      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          {geocodedProperties.length} / {properties.length} mapped
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  callout: {
    width: 200,
    padding: spacing.sm,
  },
  calloutPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  calloutAddress: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  calloutDetails: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  calloutTap: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  legend: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: fontSize.xs,
    color: colors.textPrimary,
  },
  countBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
});
