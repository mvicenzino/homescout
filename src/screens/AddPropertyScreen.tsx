import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActionSheetIOS,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import { Button, Input } from '../components/ui';
import { usePropertyStore } from '../store/propertyStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { extractPropertyData } from '../lib/openai';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';
import { HomeStackParamList, PropertyStatus } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'AddProperty'>;
  route: RouteProp<HomeStackParamList, 'AddProperty'>;
};

export function AddPropertyScreen({ navigation, route }: Props) {
  const propertyId = route.params?.propertyId;
  const initialData = route.params?.initialData;
  const isEditing = !!propertyId;

  const { properties, addProperty, updateProperty } = usePropertyStore();
  const { user, household } = useAuthStore();
  const { hasAnthropicKey, checkAnthropicKey } = useSettingsStore();
  const existingProperty = properties.find((p) => p.id === propertyId);

  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    zip: '',
    price: '',
    beds: '',
    baths: '',
    sqft: '',
    lot_size: '',
    year_built: '',
    garage: '',
    stories: '',
    hoa_monthly: '',
    property_tax_annual: '',
    insurance_annual: '',
    source_url: '',
    mls_number: '',
  });
  // Extended data captured from imports (not editable in form)
  const [extendedData, setExtendedData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (existingProperty) {
      setFormData({
        address: existingProperty.address,
        city: existingProperty.city,
        state: existingProperty.state,
        zip: existingProperty.zip,
        price: existingProperty.price.toString(),
        beds: existingProperty.beds.toString(),
        baths: existingProperty.baths.toString(),
        sqft: existingProperty.sqft.toString(),
        lot_size: existingProperty.lot_size?.toString() || '',
        year_built: existingProperty.year_built?.toString() || '',
        garage: existingProperty.garage?.toString() || '',
        stories: existingProperty.stories?.toString() || '',
        hoa_monthly: existingProperty.hoa_monthly?.toString() || '',
        property_tax_annual: existingProperty.property_tax_annual?.toString() || '',
        insurance_annual: existingProperty.insurance_annual?.toString() || '',
        source_url: existingProperty.source_url || '',
        mls_number: existingProperty.mls_number || '',
      });
    }
  }, [existingProperty]);

  useEffect(() => {
    checkAnthropicKey();
  }, []);

  // Handle deep link data from browser extension
  useEffect(() => {
    if (initialData && !isEditing) {
      // Update basic form data
      setFormData((prev) => ({
        ...prev,
        address: initialData.address || prev.address,
        city: initialData.city || prev.city,
        state: initialData.state || prev.state,
        zip: initialData.zip || prev.zip,
        price: initialData.price || prev.price,
        beds: initialData.beds || prev.beds,
        baths: initialData.baths || prev.baths,
        sqft: initialData.sqft || prev.sqft,
        lot_size: initialData.lot_size || prev.lot_size,
        year_built: initialData.year_built || prev.year_built,
        garage: initialData.garage_spaces || prev.garage,
        hoa_monthly: initialData.hoa_fee || prev.hoa_monthly,
        source_url: initialData.source_url || prev.source_url,
        mls_number: initialData.mls_number || prev.mls_number,
      }));

      // Capture extended data from browser extension
      const extended: Record<string, any> = {};
      if (initialData.property_type) extended.property_type = initialData.property_type;
      if (initialData.status) extended.status = initialData.status;
      if (initialData.description) extended.remarks = initialData.description;
      if (initialData.days_on_market) extended.days_on_market = parseInt(initialData.days_on_market);
      if (initialData.listing_agent) extended.listing_agent = initialData.listing_agent;
      if (initialData.price_per_sqft) extended.price_per_sqft = parseInt(initialData.price_per_sqft);
      if (initialData.nearby_schools) extended.nearby_schools = initialData.nearby_schools;
      if (initialData.photo_urls) extended.photo_urls = initialData.photo_urls.split('|');

      if (Object.keys(extended).length > 0) {
        setExtendedData(extended);
      }

      // Show notification that data was imported
      const fieldsImported = [
        initialData.address && 'address',
        initialData.price && 'price',
        initialData.beds && 'beds/baths',
        initialData.sqft && 'sqft',
      ].filter(Boolean).length;

      Alert.alert(
        'Property Imported',
        `Property data from ${initialData.source || 'Redfin'} has been imported (${fieldsImported} fields). Review and save when ready.`,
        [{ text: 'OK' }]
      );
    }
  }, [initialData, isEditing]);

  const handleImportSpecSheet = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Paste URL', 'Paste Image', 'Paste JSON', 'Take Photo', 'Choose from Library', 'Select PDF'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handlePasteURL();
          } else if (buttonIndex === 2) {
            handlePasteImage();
          } else if (buttonIndex === 3) {
            handlePasteText();
          } else if (buttonIndex === 4) {
            handleImageImport('camera');
          } else if (buttonIndex === 5) {
            handleImageImport('library');
          } else if (buttonIndex === 6) {
            handleImageImport('pdf');
          }
        }
      );
    } else {
      Alert.alert(
        'Import Spec Sheet',
        'Choose how to import your spec sheet',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Paste URL', onPress: handlePasteURL },
          { text: 'Paste Image', onPress: handlePasteImage },
          { text: 'Paste JSON', onPress: handlePasteText },
          { text: 'Take Photo', onPress: () => handleImageImport('camera') },
          { text: 'Choose from Library', onPress: () => handleImageImport('library') },
          { text: 'Select PDF', onPress: () => handleImageImport('pdf') },
        ]
      );
    }
  };

  const handlePasteURL = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();

      if (!clipboardContent) {
        Alert.alert('Empty Clipboard', 'Copy a listing URL to your clipboard first.');
        return;
      }

      // Check if it's a valid URL
      const urlPattern = /^https?:\/\/(www\.)?(redfin|zillow|realtor)\.com/i;
      if (!urlPattern.test(clipboardContent)) {
        Alert.alert(
          'Invalid URL',
          'Please copy a listing URL from Redfin, Zillow, or Realtor.com.'
        );
        return;
      }

      // Parse URL to extract data
      const url = new URL(clipboardContent);
      const pathParts = url.pathname.split('/').filter(Boolean);

      let extractedData: Record<string, string> = {
        source_url: clipboardContent,
      };

      if (clipboardContent.includes('redfin.com')) {
        // Redfin URL format: /STATE/City/Address-Zip/home/ID
        // e.g., /NJ/Chester/309-North-Rd-07930/home/37150152
        if (pathParts.length >= 3) {
          extractedData.state = pathParts[0].toUpperCase();
          extractedData.city = pathParts[1].replace(/-/g, ' ');

          const addressPart = pathParts[2] || '';
          // Extract zip from address part
          const zipMatch = addressPart.match(/(\d{5})(?:-\d{4})?$/);
          if (zipMatch) {
            extractedData.zip = zipMatch[1];
          }
          // Remove zip from address
          const address = addressPart
            .replace(/-?\d{5}(?:-\d{4})?$/, '')
            .replace(/-/g, ' ')
            .trim();
          if (address) {
            extractedData.address = address;
          }
        }
      } else if (clipboardContent.includes('zillow.com')) {
        // Zillow URL format: /homedetails/Address-City-State-Zip/ID_zpid
        const addressMatch = url.pathname.match(/homedetails\/([^/]+)\//);
        if (addressMatch) {
          const parts = addressMatch[1].split('-');
          // Last part is usually ZIP_zpid, second to last is state
          if (parts.length >= 4) {
            const zipPart = parts[parts.length - 1];
            const zipMatch = zipPart.match(/^(\d{5})/);
            if (zipMatch) extractedData.zip = zipMatch[1];

            extractedData.state = parts[parts.length - 2].toUpperCase();
            extractedData.city = parts[parts.length - 3].replace(/([A-Z])/g, ' $1').trim();

            // Everything before city is the address
            const addressParts = parts.slice(0, parts.length - 3);
            extractedData.address = addressParts.join(' ');
          }
        }
      } else if (clipboardContent.includes('realtor.com')) {
        // Realtor URL format: /realestateandhomes-detail/Address_City_State_Zip/ID
        const addressMatch = url.pathname.match(/detail\/([^/]+)/);
        if (addressMatch) {
          const parts = addressMatch[1].split('_');
          if (parts.length >= 4) {
            extractedData.address = parts[0].replace(/-/g, ' ');
            extractedData.city = parts[1].replace(/-/g, ' ');
            extractedData.state = parts[2].toUpperCase();
            const zipMatch = parts[3].match(/^(\d{5})/);
            if (zipMatch) extractedData.zip = zipMatch[1];
          }
        }
      }

      // Update form with extracted data
      setFormData((prev) => ({
        ...prev,
        address: extractedData.address || prev.address,
        city: extractedData.city || prev.city,
        state: extractedData.state || prev.state,
        zip: extractedData.zip || prev.zip,
        source_url: extractedData.source_url || prev.source_url,
      }));

      const fieldsFound = [
        extractedData.address,
        extractedData.city,
        extractedData.state,
        extractedData.zip,
      ].filter(Boolean).length;

      Alert.alert(
        'URL Imported',
        `Extracted ${fieldsFound} fields from URL. Fill in the remaining details (price, beds, baths, etc.) manually or take a screenshot of the listing and use "Paste Image" to auto-fill.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error parsing URL:', error);
      Alert.alert('Error', 'Failed to parse the URL. Please enter details manually.');
    }
  };

  const handlePasteImage = async () => {
    if (!hasAnthropicKey) {
      Alert.alert(
        'API Key Required',
        'Please add your Claude API key in Settings to use image import.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.getParent()?.navigate('Settings') },
        ]
      );
      return;
    }

    try {
      const hasImage = await Clipboard.hasImageAsync();

      if (!hasImage) {
        Alert.alert(
          'No Image Found',
          'Copy an image to your clipboard first (long-press an image in Photos and tap Copy), then try again.'
        );
        return;
      }

      const clipboardImage = await Clipboard.getImageAsync({ format: 'png' });

      if (clipboardImage && clipboardImage.data) {
        await processImage(clipboardImage.data, 'image/png');
      } else {
        Alert.alert('Error', 'Could not read image from clipboard');
      }
    } catch (error) {
      console.error('Error pasting image:', error);
      Alert.alert('Error', 'Failed to paste image from clipboard');
    }
  };

  const handleImageImport = (type: 'camera' | 'library' | 'pdf') => {
    if (!hasAnthropicKey) {
      Alert.alert(
        'API Key Required',
        'Please add your Claude API key in Settings to use image/PDF import.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.getParent()?.navigate('Settings') },
        ]
      );
      return;
    }

    if (type === 'camera') {
      handleTakePhoto();
    } else if (type === 'library') {
      handleChoosePhoto();
    } else {
      handleSelectPDF();
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await processImage(result.assets[0].base64, 'image/jpeg');
    }
  };

  const handleChoosePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const mimeType = result.assets[0].uri.toLowerCase().endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';
      await processImage(result.assets[0].base64, mimeType);
    }
  };

  const handleSelectPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        // Read the PDF file as base64
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: 'base64',
        });
        await processImage(base64, 'application/pdf');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select PDF file');
    }
  };

  const handlePasteText = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();

      if (!clipboardContent) {
        Alert.alert('Empty Clipboard', 'Copy listing text to your clipboard first, then try again.');
        return;
      }

      // Try to parse as JSON first
      let data;
      let isJson = false;
      try {
        data = JSON.parse(clipboardContent);
        isJson = true;
      } catch {
        // Not JSON, will use AI extraction
      }

      if (isJson && data) {
        // Handle JSON (nested or flat structure)
        const prop = data.property || data;
        const details = data.details || data;
        const lot = data.lot || data;
        const exterior = data.exterior || data;
        const financial = data.financial || data;
        const interior = data.interior || data;
        const utilities = data.utilities || data;

        // Helper to get value from multiple possible keys
        const get = (...keys: string[]) => {
          for (const key of keys) {
            const val = prop[key] ?? details[key] ?? data[key] ?? interior[key] ?? exterior[key] ?? lot[key] ?? financial[key] ?? utilities[key];
            if (val !== undefined && val !== null) return val;
          }
          return undefined;
        };

        const fullBaths = get('fullBaths', 'full_baths') || 0;
        const halfBaths = get('halfBaths', 'half_baths') || 0;
        const totalBaths = fullBaths + (halfBaths * 0.5);

        const garageSpaces = exterior.garage?.spaces ?? get('garage', 'garageSpaces');

        let lotSizeSqft = get('lot_size', 'lotSize', 'lotSqft');
        const lotAcres = get('acres', 'lot_acres', 'lotAcres');
        if (!lotSizeSqft && lotAcres) {
          lotSizeSqft = Math.round(lotAcres * 43560);
        }

        const zipCode = String(get('zip', 'zipCode', 'postalCode') || '').split('-')[0];
        const yearBuilt = get('yearBuilt', 'year_built');

        // Basic form data
        setFormData((prev) => ({
          address: get('address', 'streetAddress') || prev.address,
          city: get('city') || prev.city,
          state: get('state') || prev.state,
          zip: zipCode || prev.zip,
          price: get('listPrice', 'price', 'askingPrice')?.toString() || prev.price,
          beds: get('bedrooms', 'beds')?.toString() || prev.beds,
          baths: (totalBaths || get('baths', 'bathrooms'))?.toString() || prev.baths,
          sqft: get('sqft', 'squareFeet', 'livingArea')?.toString() || prev.sqft,
          lot_size: lotSizeSqft?.toString() || prev.lot_size,
          year_built: (yearBuilt !== 9999 ? yearBuilt : null)?.toString() || prev.year_built,
          garage: garageSpaces?.toString() || prev.garage,
          stories: get('stories', 'floors', 'levels')?.toString() || prev.stories,
          hoa_monthly: get('fee', 'hoa_monthly', 'hoaFee', 'hoaMonthly')?.toString() || prev.hoa_monthly,
          property_tax_annual: (financial.taxes?.amount ?? get('property_tax_annual', 'propertyTax', 'annualTax'))?.toString() || prev.property_tax_annual,
          insurance_annual: get('insurance_annual', 'annualInsurance')?.toString() || prev.insurance_annual,
          source_url: get('source_url', 'sourceUrl', 'listingUrl', 'url') || prev.source_url,
          mls_number: get('mlsNumber', 'mls_number', 'mlsId', 'listingId')?.toString() || prev.mls_number,
        }));

        // Calculate price per sqft
        const price = get('listPrice', 'price', 'askingPrice');
        const sqft = get('sqft', 'squareFeet', 'livingArea');
        const pricePerSqft = price && sqft ? Math.round(price / sqft) : undefined;

        // Get array fields - handle both nested and flat
        const getArray = (...keys: string[]) => {
          for (const key of keys) {
            const val = interior[key] ?? exterior[key] ?? lot[key] ?? data[key] ?? prop[key];
            if (Array.isArray(val) && val.length > 0) return val;
          }
          return undefined;
        };

        // Extended data from rich JSON
        const extended: Record<string, any> = {
          // Location
          county: get('county'),

          // Bath breakdown
          full_baths: fullBaths || undefined,
          half_baths: halfBaths || undefined,

          // Lot
          lot_acres: lotAcres,
          lot_description: getArray('lotDescription', 'lot_description', 'lotFeatures'),

          // Rooms
          rooms: get('rooms', 'totalRooms'),

          // Property type & style
          property_type: get('propertyType', 'property_type', 'type', 'homeType'),
          property_style: get('style', 'property_style', 'architecturalStyle'),

          // Features
          interior_features: getArray('interiorFeatures', 'interior_features'),
          exterior_features: getArray('exteriorFeatures', 'exterior_features'),
          appliances: getArray('appliances', 'includedAppliances'),
          flooring: getArray('flooring', 'floorTypes'),
          garage_type: exterior.garage?.type ? (Array.isArray(exterior.garage.type) ? exterior.garage.type : [exterior.garage.type]) : getArray('garageType', 'garage_type'),
          kitchen_features: getArray('kitchenFeatures', 'kitchen_features'),

          // Utilities
          heating: utilities.heating?.type ?? get('heating', 'heatingType'),
          cooling: get('cooling', 'coolingType', 'airConditioning'),
          basement: get('basement', 'basementType'),
          roof: get('roof', 'roofType'),
          sewer: get('sewer', 'sewerType'),
          water: get('water', 'waterSource'),
          fuel: get('fuel', 'fuelType'),

          // Construction
          fireplaces: get('fireplaces', 'numberOfFireplaces'),
          driveway: get('driveway', 'drivewayType'),
          exterior_finish: get('exteriorFinish', 'exterior_finish', 'exteriorMaterial'),

          // In-law suite
          has_in_law_suite: interior.inLawSuite?.hasInLaw ?? get('hasInLawSuite', 'has_in_law_suite', 'inLawSuite') ?? false,
          in_law_features: interior.inLawSuite?.features ?? getArray('inLawFeatures', 'in_law_features'),

          // Description
          remarks: get('remarks', 'description', 'publicRemarks'),
          directions: get('directions'),

          // Analysis fields
          original_list_price: get('originalListPrice', 'original_list_price', 'originalPrice'),
          price_per_sqft: pricePerSqft ?? get('pricePerSqft', 'price_per_sqft'),
          days_on_market: get('daysOnMarket', 'days_on_market', 'dom'),
          list_date: get('listDate', 'list_date', 'listingDate'),
          expiration_date: get('expirationDate', 'expiration_date'),

          // Tax & Assessment
          tax_year: financial.taxes?.year ?? get('taxYear', 'tax_year'),
          tax_rate: financial.taxRate?.rate ?? get('taxRate', 'tax_rate'),
          assessed_value_total: financial.assessments?.total ?? get('assessedValueTotal', 'assessed_value_total', 'assessedValue'),
          assessed_value_land: financial.assessments?.land ?? get('assessedValueLand', 'assessed_value_land'),
          assessed_value_building: financial.assessments?.building ?? get('assessedValueBuilding', 'assessed_value_building'),

          // Additional details
          age_restricted: get('ageRestricted', 'age_restricted'),
          pets_allowed: get('petsAllowed', 'pets_allowed'),
          short_sale: financial.shortSaleApprovalRequired ?? get('shortSale', 'short_sale'),
          ownership_type: get('ownershipType', 'ownership_type'),

          // Year renovated
          year_renovated: get('yearRenovated', 'year_renovated'),
        };

        // Remove undefined/null values
        const cleanExtended: Record<string, any> = {};
        for (const [key, value] of Object.entries(extended)) {
          if (value !== undefined && value !== null && value !== '' && value !== false) {
            cleanExtended[key] = value;
          }
        }

        setExtendedData(cleanExtended);

        const fieldCount = Object.keys(cleanExtended).length;
        Alert.alert('Success', `Property data imported! ${fieldCount} extended fields captured. Please review and save.`);
      } else {
        // Not valid JSON - show helpful error
        Alert.alert(
          'Invalid JSON',
          'The clipboard does not contain valid JSON. Make sure to copy the complete JSON object starting with { and ending with }.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error pasting text:', error);
      setIsImporting(false);
      Alert.alert('Error', 'Failed to import from clipboard');
    }
  };

  const processImage = async (base64: string, mimeType: string) => {
    setIsImporting(true);

    const result = await extractPropertyData(base64, mimeType);

    setIsImporting(false);

    if (result.error) {
      Alert.alert('Import Failed', result.error);
      return;
    }

    if (result.data) {
      // Update form with extracted data
      setFormData((prev) => ({
        address: result.data?.address || prev.address,
        city: result.data?.city || prev.city,
        state: result.data?.state || prev.state,
        zip: result.data?.zip || prev.zip,
        price: result.data?.price?.toString() || prev.price,
        beds: result.data?.beds?.toString() || prev.beds,
        baths: result.data?.baths?.toString() || prev.baths,
        sqft: result.data?.sqft?.toString() || prev.sqft,
        lot_size: result.data?.lot_size?.toString() || prev.lot_size,
        year_built: result.data?.year_built?.toString() || prev.year_built,
        garage: result.data?.garage?.toString() || prev.garage,
        stories: result.data?.stories?.toString() || prev.stories,
        hoa_monthly: result.data?.hoa_monthly?.toString() || prev.hoa_monthly,
        property_tax_annual: result.data?.property_tax_annual?.toString() || prev.property_tax_annual,
        insurance_annual: result.data?.insurance_annual?.toString() || prev.insurance_annual,
        source_url: result.data?.source_url || prev.source_url,
        mls_number: result.data?.mls_number || prev.mls_number,
      }));

      Alert.alert('Success', 'Property data extracted! Please review and save.');
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.address || !formData.city || !formData.state || !formData.zip) {
      Alert.alert('Error', 'Please fill in the address fields');
      return;
    }
    if (!formData.price || isNaN(Number(formData.price))) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setIsLoading(true);

    // Clean undefined values from extendedData
    const cleanExtendedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(extendedData)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanExtendedData[key] = value;
      }
    }

    const propertyData = {
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
      price: parseInt(formData.price),
      beds: parseInt(formData.beds) || 0,
      baths: parseFloat(formData.baths) || 0,
      sqft: parseInt(formData.sqft) || 0,
      lot_size: formData.lot_size ? parseInt(formData.lot_size) : undefined,
      year_built: formData.year_built ? parseInt(formData.year_built) : undefined,
      garage: formData.garage ? parseInt(formData.garage) : undefined,
      stories: formData.stories ? parseInt(formData.stories) : undefined,
      hoa_monthly: formData.hoa_monthly ? parseInt(formData.hoa_monthly) : undefined,
      property_tax_annual: formData.property_tax_annual
        ? parseInt(formData.property_tax_annual)
        : undefined,
      insurance_annual: formData.insurance_annual
        ? parseInt(formData.insurance_annual)
        : undefined,
      source_url: formData.source_url || undefined,
      mls_number: formData.mls_number || undefined,
      // Merge extended data from imports
      ...cleanExtendedData,
    };

    let result;
    if (isEditing && propertyId) {
      result = await updateProperty(propertyId, propertyData);
    } else {
      result = await addProperty({
        ...propertyData,
        household_id: household!.id,
        created_by: user!.id,
        status: 'interested' as PropertyStatus,
      });
    }

    setIsLoading(false);

    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Import Section */}
        {!isEditing && (
          <View style={styles.importSection}>
            <Button
              title="Import from Spec Sheet"
              onPress={handleImportSpecSheet}
              variant="outline"
              fullWidth
              disabled={isImporting}
            />
            <Text style={styles.importHint}>
              Paste an image or JSON to auto-fill property details
            </Text>
          </View>
        )}

        {/* Loading Overlay */}
        {isImporting && (
          <View style={styles.importingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.importingText}>Extracting property data...</Text>
          </View>
        )}

        {/* Extended Data Banner */}
        {Object.keys(extendedData).length > 0 && (
          <View style={styles.extendedDataBanner}>
            <Text style={styles.extendedDataIcon}>✓</Text>
            <View style={styles.extendedDataText}>
              <Text style={styles.extendedDataTitle}>Rich Data Imported</Text>
              <Text style={styles.extendedDataSubtitle}>
                {[
                  extendedData.property_type,
                  extendedData.property_style,
                  extendedData.price_per_sqft && `$${extendedData.price_per_sqft}/sqft`,
                  extendedData.assessed_value_total && `Assessed: $${(extendedData.assessed_value_total / 1000).toFixed(0)}k`,
                  extendedData.has_in_law_suite && 'In-law suite',
                ].filter(Boolean).slice(0, 3).join(' • ')}
              </Text>
              <Text style={styles.extendedDataSubtitle}>
                +{Object.keys(extendedData).filter(k => extendedData[k]).length} fields captured
              </Text>
            </View>
          </View>
        )}

        {/* Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>

          <Input
            label="Street Address"
            placeholder="123 Main St"
            value={formData.address}
            onChangeText={(v) => updateField('address', v)}
          />

          <View style={styles.row}>
            <View style={styles.flex2}>
              <Input
                label="City"
                placeholder="City"
                value={formData.city}
                onChangeText={(v) => updateField('city', v)}
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="State"
                placeholder="CA"
                value={formData.state}
                onChangeText={(v) => updateField('state', v)}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="ZIP"
                placeholder="12345"
                value={formData.zip}
                onChangeText={(v) => updateField('zip', v)}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
          </View>
        </View>

        {/* Price & Basics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Details</Text>

          <Input
            label="Listing Price"
            placeholder="500000"
            value={formData.price}
            onChangeText={(v) => updateField('price', v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Beds"
                placeholder="3"
                value={formData.beds}
                onChangeText={(v) => updateField('beds', v)}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Baths"
                placeholder="2"
                value={formData.baths}
                onChangeText={(v) => updateField('baths', v)}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Sqft"
                placeholder="1500"
                value={formData.sqft}
                onChangeText={(v) => updateField('sqft', v)}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Lot Size (sqft)"
                placeholder="5000"
                value={formData.lot_size}
                onChangeText={(v) => updateField('lot_size', v)}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Year Built"
                placeholder="2000"
                value={formData.year_built}
                onChangeText={(v) => updateField('year_built', v)}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Garage Spaces"
                placeholder="2"
                value={formData.garage}
                onChangeText={(v) => updateField('garage', v)}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Stories"
                placeholder="2"
                value={formData.stories}
                onChangeText={(v) => updateField('stories', v)}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Financial Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Details</Text>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Monthly HOA"
                placeholder="0"
                value={formData.hoa_monthly}
                onChangeText={(v) => updateField('hoa_monthly', v)}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Annual Taxes"
                placeholder="6000"
                value={formData.property_tax_annual}
                onChangeText={(v) => updateField('property_tax_annual', v)}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Input
            label="Annual Insurance"
            placeholder="1500"
            value={formData.insurance_annual}
            onChangeText={(v) => updateField('insurance_annual', v)}
            keyboardType="number-pad"
          />
        </View>

        {/* Listing Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listing Info (Optional)</Text>

          <Input
            label="Listing URL"
            placeholder="https://zillow.com/..."
            value={formData.source_url}
            onChangeText={(v) => updateField('source_url', v)}
            keyboardType="url"
            autoCapitalize="none"
          />

          <Input
            label="MLS Number"
            placeholder="MLS12345"
            value={formData.mls_number}
            onChangeText={(v) => updateField('mls_number', v)}
            autoCapitalize="characters"
          />
        </View>

        <Button
          title={isEditing ? 'Save Changes' : 'Add Property'}
          onPress={handleSave}
          loading={isLoading}
          fullWidth
          style={styles.saveButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  saveButton: {
    marginTop: spacing.md,
  },
  importSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  importHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  importingOverlay: {
    backgroundColor: colors.background,
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  importingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  extendedDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  extendedDataIcon: {
    fontSize: fontSize.xl,
    color: colors.success,
    marginRight: spacing.md,
  },
  extendedDataText: {
    flex: 1,
  },
  extendedDataTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  extendedDataSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
