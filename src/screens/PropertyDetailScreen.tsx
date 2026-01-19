import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Badge, getStatusBadgeVariant, StarRating, Button } from '../components/ui';
import { usePropertyStore, getPropertyWithRatings } from '../store/propertyStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { analyzeProperty, PropertyAnalysis, SavedAnalysis, savePropertyAnalysis, getPropertyAnalysis } from '../lib/openai';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import {
  formatCurrency,
  formatCurrencyWithCents,
  formatBedsBaths,
  formatSqft,
  formatPricePerSqft,
  formatPropertyStatus,
  formatDaysOnMarket,
} from '../lib/formatters';
import { calculateTotalMonthlyCost } from '../lib/calculators';
import { HomeStackParamList, PropertyStatus, NoteType, Offer, OfferStatus, PropertyDocument } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'PropertyDetail'>;
  route: RouteProp<HomeStackParamList, 'PropertyDetail'>;
};

type Tab = 'overview' | 'photos' | 'notes' | 'offers' | 'financials';

const statusOptions: { value: PropertyStatus; label: string }[] = [
  { value: 'interested', label: 'Interested' },
  { value: 'toured', label: 'Toured' },
  { value: 'offer_made', label: 'Offer Made' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'purchased', label: 'Purchased' },
];

export function PropertyDetailScreen({ navigation, route }: Props) {
  const { propertyId } = route.params;
  const { properties, isLoading, fetchProperties, updatePropertyStatus, setRating, addNote, deleteNote, addPhoto, addTag, removeTag, deleteProperty } =
    usePropertyStore();
  const { user } = useAuthStore();
  const { calculatorDefaults, financialProfile } = useSettingsStore();

  const property = properties.find((p) => p.id === propertyId);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('general');
  const [newTag, setNewTag] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [analysis, setAnalysis] = useState<PropertyAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisMetadata, setAnalysisMetadata] = useState<{
    analyzedAt: string;
    hasFinancialContext: boolean;
  } | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);

  // Offers state
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerForm, setOfferForm] = useState({
    amount: '',
    earnest_money: '',
    expiration_date: '',
    closing_date: '',
    notes: '',
    contingencies: [] as string[],
  });

  // Documents state
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);

  // Load offers and documents
  useEffect(() => {
    loadOffersAndDocs();
  }, [propertyId]);

  const loadOffersAndDocs = async () => {
    try {
      const offersData = await AsyncStorage.getItem(`offers_${propertyId}`);
      if (offersData) setOffers(JSON.parse(offersData));

      const docsData = await AsyncStorage.getItem(`docs_${propertyId}`);
      if (docsData) setDocuments(JSON.parse(docsData));
    } catch (error) {
      console.error('Error loading offers/docs:', error);
    }
  };

  const saveOffer = async (offer: Partial<Offer>) => {
    const newOffer: Offer = {
      id: editingOffer?.id || Date.now().toString(),
      property_id: propertyId,
      amount: parseInt(offerForm.amount) || 0,
      offer_date: editingOffer?.offer_date || new Date().toISOString(),
      expiration_date: offerForm.expiration_date || undefined,
      status: editingOffer?.status || 'draft',
      contingencies: offerForm.contingencies,
      earnest_money: offerForm.earnest_money ? parseInt(offerForm.earnest_money) : undefined,
      closing_date: offerForm.closing_date || undefined,
      notes: offerForm.notes || undefined,
      created_by: user?.id || '',
      created_at: editingOffer?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedOffers = editingOffer
      ? offers.map((o) => (o.id === editingOffer.id ? newOffer : o))
      : [...offers, newOffer];

    setOffers(updatedOffers);
    await AsyncStorage.setItem(`offers_${propertyId}`, JSON.stringify(updatedOffers));
    setShowOfferModal(false);
    setEditingOffer(null);
    resetOfferForm();
  };

  const updateOfferStatus = async (offerId: string, status: OfferStatus) => {
    const updatedOffers = offers.map((o) =>
      o.id === offerId ? { ...o, status, updated_at: new Date().toISOString() } : o
    );
    setOffers(updatedOffers);
    await AsyncStorage.setItem(`offers_${propertyId}`, JSON.stringify(updatedOffers));
  };

  const deleteOffer = async (offerId: string) => {
    Alert.alert('Delete Offer', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedOffers = offers.filter((o) => o.id !== offerId);
          setOffers(updatedOffers);
          await AsyncStorage.setItem(`offers_${propertyId}`, JSON.stringify(updatedOffers));
        },
      },
    ]);
  };

  const resetOfferForm = () => {
    setOfferForm({
      amount: '',
      earnest_money: '',
      expiration_date: '',
      closing_date: '',
      notes: '',
      contingencies: [],
    });
  };

  const handleAddDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const docType = await promptDocumentType();
        if (!docType) return;

        const newDoc: PropertyDocument = {
          id: Date.now().toString(),
          property_id: propertyId,
          name: file.name,
          type: docType,
          url: file.uri,
          file_size: file.size,
          uploaded_by: user?.id || '',
          created_at: new Date().toISOString(),
        };

        const updatedDocs = [...documents, newDoc];
        setDocuments(updatedDocs);
        await AsyncStorage.setItem(`docs_${propertyId}`, JSON.stringify(updatedDocs));
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to add document');
    }
  };

  const promptDocumentType = (): Promise<PropertyDocument['type'] | null> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Document Type',
        'What type of document is this?',
        [
          { text: 'Inspection', onPress: () => resolve('inspection') },
          { text: 'Disclosure', onPress: () => resolve('disclosure') },
          { text: 'Appraisal', onPress: () => resolve('appraisal') },
          { text: 'Contract', onPress: () => resolve('contract') },
          { text: 'Other', onPress: () => resolve('other') },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        ]
      );
    });
  };

  const deleteDocument = async (docId: string) => {
    Alert.alert('Delete Document', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedDocs = documents.filter((d) => d.id !== docId);
          setDocuments(updatedDocs);
          await AsyncStorage.setItem(`docs_${propertyId}`, JSON.stringify(updatedDocs));
        },
      },
    ]);
  };

  const openDocument = async (doc: PropertyDocument) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(doc.url);
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const getOfferStatusColor = (status: OfferStatus) => {
    switch (status) {
      case 'draft': return colors.textMuted;
      case 'submitted': return colors.primary;
      case 'countered': return colors.warning;
      case 'accepted': return colors.success;
      case 'rejected': return colors.error;
      case 'expired': return colors.textMuted;
      case 'withdrawn': return colors.textMuted;
      default: return colors.textMuted;
    }
  };

  // Load saved analysis on mount
  useEffect(() => {
    const loadSavedAnalysis = async () => {
      if (!propertyId) return;
      setIsLoadingAnalysis(true);
      const saved = await getPropertyAnalysis(propertyId);
      if (saved) {
        setAnalysis(saved.analysis);
        setAnalysisMetadata({
          analyzedAt: saved.analyzedAt,
          hasFinancialContext: saved.hasFinancialContext,
        });
      }
      setIsLoadingAnalysis(false);
    };
    loadSavedAnalysis();
  }, [propertyId]);

  if (!property) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Property not found</Text>
      </View>
    );
  }

  const propertyWithRatings = getPropertyWithRatings(property, user?.id || '');

  // Calculate monthly cost
  const monthlyCost = useMemo(() => {
    const downPayment = property.price * (calculatorDefaults.downPaymentPercent / 100);
    return calculateTotalMonthlyCost({
      purchasePrice: property.price,
      downPayment,
      annualInterestRate: calculatorDefaults.interestRate,
      loanTermYears: calculatorDefaults.loanTermYears,
      propertyTaxAnnual: property.property_tax_annual || property.price * (calculatorDefaults.propertyTaxRate / 100),
      insuranceAnnual: property.insurance_annual || property.price * (calculatorDefaults.insuranceRate / 100),
      hoaMonthly: property.hoa_monthly || 0,
    });
  }, [property, calculatorDefaults]);

  const handleRating = async (rating: number) => {
    await setRating(property.id, rating);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addNote(property.id, newNote.trim(), noteType);
    setNewNote('');
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    await addTag(property.id, newTag.trim());
    setNewTag('');
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // In production, upload to Supabase Storage
      // For now, just use the local URI
      await addPhoto(property.id, result.assets[0].uri);
    }
  };

  const handlePastePhoto = async () => {
    try {
      const hasImage = await Clipboard.hasImageAsync();

      if (!hasImage) {
        Alert.alert(
          'No Image Found',
          'Copy an image to your clipboard first (long-press an image and tap Copy), then try again.'
        );
        return;
      }

      const clipboardImage = await Clipboard.getImageAsync({ format: 'png' });

      if (clipboardImage && clipboardImage.data) {
        // Use data URI directly
        const dataUri = `data:image/png;base64,${clipboardImage.data}`;
        await addPhoto(property.id, dataUri);
        Alert.alert('Success', 'Photo added from clipboard');
      } else {
        Alert.alert('Error', 'Could not read image from clipboard');
      }
    } catch (error) {
      console.error('Error pasting photo:', error);
      Alert.alert('Error', 'Failed to paste photo from clipboard');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Property',
      'Are you sure you want to delete this property?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProperty(property.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const hasFinancialData = Boolean(
    financialProfile.annual_household_income ||
    financialProfile.available_down_payment ||
    financialProfile.target_monthly_payment
  );

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    const result = await analyzeProperty(property, financialProfile);

    setIsAnalyzing(false);

    if (result.error) {
      setAnalysisError(result.error);
    } else if (result.data) {
      setAnalysis(result.data);
      // Save the analysis
      await savePropertyAnalysis(
        property.id,
        result.data,
        property.price,
        hasFinancialData
      );
      setAnalysisMetadata({
        analyzedAt: new Date().toISOString(),
        hasFinancialContext: hasFinancialData,
      });
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'photos', label: 'Photos' },
    { key: 'notes', label: 'Notes' },
    { key: 'offers', label: 'Offers' },
    { key: 'financials', label: 'Costs' },
  ];

  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.price}>{formatCurrency(property.price)}</Text>
          <Text style={styles.address}>{property.address}</Text>
          <Text style={styles.location}>
            {property.city}, {property.state} {property.zip}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddProperty', { propertyId: property.id })}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{property.beds}</Text>
          <Text style={styles.statLabel}>beds</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{property.baths}</Text>
          <Text style={styles.statLabel}>baths</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{property.sqft.toLocaleString()}</Text>
          <Text style={styles.statLabel}>sqft</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatPricePerSqft(property.price, property.sqft)}</Text>
          <Text style={styles.statLabel}>per sqft</Text>
        </View>
      </View>

      {/* Status & Ratings */}
      <View style={styles.statusRow}>
        <TouchableOpacity
          style={styles.statusButton}
          onPress={() => setShowStatusPicker(!showStatusPicker)}
        >
          <Badge
            label={formatPropertyStatus(property.status)}
            variant={getStatusBadgeVariant(property.status)}
            size="md"
          />
          <Text style={styles.statusArrow}>{'\u25BC'}</Text>
        </TouchableOpacity>

        <View style={styles.ratings}>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingLabel}>Your Rating</Text>
            <StarRating
              rating={propertyWithRatings.my_rating || 0}
              editable
              onRatingChange={handleRating}
              size="md"
            />
          </View>
          {propertyWithRatings.partner_rating !== undefined && (
            <View style={styles.ratingBox}>
              <Text style={styles.ratingLabel}>Partner</Text>
              <StarRating rating={propertyWithRatings.partner_rating} size="md" />
            </View>
          )}
        </View>
      </View>

      {showStatusPicker && (
        <View style={styles.statusPicker}>
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.statusOption,
                property.status === option.value && styles.statusOptionActive,
              ]}
              onPress={() => {
                updatePropertyStatus(property.id, option.value);
                setShowStatusPicker(false);
              }}
            >
              <Text
                style={[
                  styles.statusOptionText,
                  property.status === option.value && styles.statusOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Segmented Control Tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.segmentedControl}>
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.segmentedTab,
                activeTab === tab.key && styles.segmentedTabActive,
                index === 0 && styles.segmentedTabFirst,
                index === tabs.length - 1 && styles.segmentedTabLast,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                styles.segmentedTabText,
                activeTab === tab.key && styles.segmentedTabTextActive,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchProperties} />
        }
      >
        {activeTab === 'overview' && (
          <View>
            {/* Description/Remarks */}
            {property.remarks && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Description</Text>
                <Text style={styles.remarksText}>{property.remarks}</Text>
              </Card>
            )}

            {/* Property Details */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Property Details</Text>
              <View style={styles.detailGrid}>
                {property.property_type && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <Text style={styles.detailValue}>{property.property_type}</Text>
                  </View>
                )}
                {property.property_style && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Style</Text>
                    <Text style={styles.detailValue}>{property.property_style}</Text>
                  </View>
                )}
                {property.year_built && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Year Built</Text>
                    <Text style={styles.detailValue}>{property.year_built}</Text>
                  </View>
                )}
                {property.stories && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Stories</Text>
                    <Text style={styles.detailValue}>{property.stories}</Text>
                  </View>
                )}
                {property.rooms && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Total Rooms</Text>
                    <Text style={styles.detailValue}>{property.rooms}</Text>
                  </View>
                )}
                {(property.full_baths || property.half_baths) && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Baths Detail</Text>
                    <Text style={styles.detailValue}>
                      {property.full_baths || 0} full, {property.half_baths || 0} half
                    </Text>
                  </View>
                )}
                {property.garage !== undefined && property.garage > 0 && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Garage</Text>
                    <Text style={styles.detailValue}>{property.garage} car</Text>
                  </View>
                )}
                {Array.isArray(property.garage_type) && property.garage_type.length > 0 && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Garage Type</Text>
                    <Text style={styles.detailValue}>{property.garage_type.map(String).join(', ')}</Text>
                  </View>
                )}
                {property.fireplaces && property.fireplaces > 0 && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Fireplaces</Text>
                    <Text style={styles.detailValue}>{property.fireplaces}</Text>
                  </View>
                )}
                {property.basement && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Basement</Text>
                    <Text style={styles.detailValue}>{property.basement}</Text>
                  </View>
                )}
                {property.mls_number && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>MLS #</Text>
                    <Text style={styles.detailValue}>{property.mls_number}</Text>
                  </View>
                )}
                {property.county && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>County</Text>
                    <Text style={styles.detailValue}>{property.county}</Text>
                  </View>
                )}
              </View>
            </Card>

            {/* Lot Details */}
            {(property.lot_size || property.lot_acres || (Array.isArray(property.lot_description) && property.lot_description.length > 0)) && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Lot Details</Text>
                <View style={styles.detailGrid}>
                  {property.lot_size ? (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Lot Size</Text>
                      <Text style={styles.detailValue}>{property.lot_size.toLocaleString()} sqft</Text>
                    </View>
                  ) : null}
                  {property.lot_acres ? (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Lot Acres</Text>
                      <Text style={styles.detailValue}>{property.lot_acres} acres</Text>
                    </View>
                  ) : null}
                </View>
                {Array.isArray(property.lot_description) && property.lot_description.length > 0 && (
                  <View style={styles.featureList}>
                    {property.lot_description.map((item, idx) => (
                      <Text key={idx} style={styles.featureItem}>• {String(item)}</Text>
                    ))}
                  </View>
                )}
              </Card>
            )}

            {/* Utilities */}
            {(property.heating || property.cooling || property.sewer || property.water || property.fuel) && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Utilities</Text>
                <View style={styles.detailGrid}>
                  {property.heating && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Heating</Text>
                      <Text style={styles.detailValue}>{property.heating}</Text>
                    </View>
                  )}
                  {property.cooling && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Cooling</Text>
                      <Text style={styles.detailValue}>{property.cooling}</Text>
                    </View>
                  )}
                  {property.fuel && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Fuel</Text>
                      <Text style={styles.detailValue}>{property.fuel}</Text>
                    </View>
                  )}
                  {property.sewer && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Sewer</Text>
                      <Text style={styles.detailValue}>{property.sewer}</Text>
                    </View>
                  )}
                  {property.water && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Water</Text>
                      <Text style={styles.detailValue}>{property.water}</Text>
                    </View>
                  )}
                </View>
              </Card>
            )}

            {/* Interior Features */}
            {Array.isArray(property.interior_features) && property.interior_features.length > 0 && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Interior Features</Text>
                <View style={styles.featureList}>
                  {property.interior_features.map((feature, idx) => (
                    <Text key={idx} style={styles.featureItem}>• {String(feature)}</Text>
                  ))}
                </View>
              </Card>
            )}

            {/* Kitchen Features */}
            {Array.isArray(property.kitchen_features) && property.kitchen_features.length > 0 && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Kitchen Features</Text>
                <View style={styles.featureList}>
                  {property.kitchen_features.map((feature, idx) => (
                    <Text key={idx} style={styles.featureItem}>• {String(feature)}</Text>
                  ))}
                </View>
              </Card>
            )}

            {/* Appliances */}
            {Array.isArray(property.appliances) && property.appliances.length > 0 && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Appliances</Text>
                <View style={styles.featureList}>
                  {property.appliances.map((appliance, idx) => (
                    <Text key={idx} style={styles.featureItem}>• {String(appliance)}</Text>
                  ))}
                </View>
              </Card>
            )}

            {/* Flooring */}
            {Array.isArray(property.flooring) && property.flooring.length > 0 && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Flooring</Text>
                <View style={styles.featureList}>
                  {property.flooring.map((floor, idx) => (
                    <Text key={idx} style={styles.featureItem}>• {String(floor)}</Text>
                  ))}
                </View>
              </Card>
            )}

            {/* Exterior Features */}
            {Array.isArray(property.exterior_features) && property.exterior_features.length > 0 && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Exterior Features</Text>
                <View style={styles.featureList}>
                  {property.exterior_features.map((feature, idx) => (
                    <Text key={idx} style={styles.featureItem}>• {String(feature)}</Text>
                  ))}
                </View>
              </Card>
            )}

            {/* Construction */}
            {(property.roof || property.exterior_finish || property.driveway) && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Construction</Text>
                <View style={styles.detailGrid}>
                  {property.roof && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Roof</Text>
                      <Text style={styles.detailValue}>{property.roof}</Text>
                    </View>
                  )}
                  {property.exterior_finish && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Exterior</Text>
                      <Text style={styles.detailValue}>{property.exterior_finish}</Text>
                    </View>
                  )}
                  {property.driveway && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Driveway</Text>
                      <Text style={styles.detailValue}>{property.driveway}</Text>
                    </View>
                  )}
                </View>
              </Card>
            )}

            {/* In-Law Suite */}
            {property.has_in_law_suite && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>In-Law Suite</Text>
                {Array.isArray(property.in_law_features) && property.in_law_features.length > 0 ? (
                  <View style={styles.featureList}>
                    {property.in_law_features.map((feature, idx) => (
                      <Text key={idx} style={styles.featureItem}>• {String(feature)}</Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.detailValue}>Yes</Text>
                )}
              </Card>
            )}

            {/* Tax & Assessment */}
            {(property.property_tax_annual || property.tax_rate || property.assessed_value_total) && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Tax & Assessment</Text>
                <View style={styles.detailGrid}>
                  {property.property_tax_annual && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Annual Tax</Text>
                      <Text style={styles.detailValue}>{formatCurrency(property.property_tax_annual)}</Text>
                    </View>
                  )}
                  {property.tax_rate && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Tax Rate</Text>
                      <Text style={styles.detailValue}>{property.tax_rate}%</Text>
                    </View>
                  )}
                  {property.tax_year && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Tax Year</Text>
                      <Text style={styles.detailValue}>{property.tax_year}</Text>
                    </View>
                  )}
                  {property.assessed_value_total && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Assessed Total</Text>
                      <Text style={styles.detailValue}>{formatCurrency(property.assessed_value_total)}</Text>
                    </View>
                  )}
                  {property.assessed_value_land && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Assessed Land</Text>
                      <Text style={styles.detailValue}>{formatCurrency(property.assessed_value_land)}</Text>
                    </View>
                  )}
                  {property.assessed_value_building && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Assessed Building</Text>
                      <Text style={styles.detailValue}>{formatCurrency(property.assessed_value_building)}</Text>
                    </View>
                  )}
                </View>
              </Card>
            )}

            {/* Listing Info */}
            {(property.listing_date || property.days_on_market || property.original_list_price) && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Listing Info</Text>
                <View style={styles.detailGrid}>
                  {property.listing_date && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Days on Market</Text>
                      <Text style={styles.detailValue}>{formatDaysOnMarket(property.listing_date)}</Text>
                    </View>
                  )}
                  {property.days_on_market && !property.listing_date && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Days on Market</Text>
                      <Text style={styles.detailValue}>{property.days_on_market}</Text>
                    </View>
                  )}
                  {property.original_list_price && property.original_list_price !== property.price && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Original Price</Text>
                      <Text style={styles.detailValue}>{formatCurrency(property.original_list_price)}</Text>
                    </View>
                  )}
                  {property.price_per_sqft && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Price/Sqft</Text>
                      <Text style={styles.detailValue}>${property.price_per_sqft}</Text>
                    </View>
                  )}
                </View>
              </Card>
            )}

            {/* Tags */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Tags</Text>

              {/* Current Tags */}
              {Array.isArray(property.tags) && property.tags.length > 0 && (
                <View style={styles.currentTagsRow}>
                  {property.tags.map((tag) => (
                    <TouchableOpacity
                      key={tag.id}
                      style={styles.tagChip}
                      onPress={() => removeTag(property.id, tag.tag)}
                    >
                      <Text style={styles.tagChipText}>{String(tag.tag || '')}</Text>
                      <Text style={styles.tagRemove}>{'\u00D7'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Quick Tags */}
              <Text style={styles.quickTagsLabel}>Quick add:</Text>
              <View style={styles.quickTagsGrid}>
                {[
                  'Great Location', 'Needs Work', 'Move-in Ready', 'Good Value',
                  'Large Yard', 'Updated Kitchen', 'Pool', 'Garage',
                  'Quiet Street', 'Near Schools', 'Commute Friendly', 'Must See'
                ].map((quickTag) => {
                  const isAdded = Array.isArray(property.tags) &&
                    property.tags.some((t) => t.tag === quickTag);
                  return (
                    <TouchableOpacity
                      key={quickTag}
                      style={[
                        styles.quickTagChip,
                        isAdded && styles.quickTagChipActive,
                      ]}
                      onPress={() => {
                        if (isAdded) {
                          removeTag(property.id, quickTag);
                        } else {
                          addTag(property.id, quickTag);
                        }
                      }}
                    >
                      <Text style={[
                        styles.quickTagText,
                        isAdded && styles.quickTagTextActive,
                      ]}>
                        {isAdded ? `✓ ${quickTag}` : quickTag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Tag Input */}
              <View style={styles.addTagRow}>
                <TextInput
                  style={styles.addTagInput}
                  placeholder="Add custom tag..."
                  value={newTag}
                  onChangeText={setNewTag}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity style={styles.addTagButton} onPress={handleAddTag}>
                  <Text style={styles.addTagButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Quick Financial Summary */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Estimated Monthly Cost</Text>
              <Text style={styles.totalCost}>{formatCurrencyWithCents(monthlyCost.total)}/mo</Text>
              <Text style={styles.costNote}>
                Based on {calculatorDefaults.downPaymentPercent}% down, {calculatorDefaults.interestRate}% rate
              </Text>
            </Card>

            {/* Delete Button */}
            <Button
              title="Delete Property"
              variant="danger"
              onPress={handleDelete}
              style={styles.deleteButton}
            />
          </View>
        )}

        {activeTab === 'photos' && (
          <View>
            <View style={styles.photoButtonsRow}>
              <TouchableOpacity style={styles.addPhotoButton} onPress={handlePickImage}>
                <Text style={styles.addPhotoText}>+ From Library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pastePhotoButton} onPress={handlePastePhoto}>
                <Text style={styles.pastePhotoText}>📋 Paste Photo</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.photoHint}>
              Tip: Copy images from Redfin or Zillow, then tap "Paste Photo"
            </Text>
            <View style={styles.photoGrid}>
              {property.photos?.map((photo) => (
                <Image
                  key={photo.id}
                  source={{ uri: photo.url }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ))}
            </View>
            {(!property.photos || property.photos.length === 0) && (
              <Text style={styles.emptyText}>No photos yet</Text>
            )}
          </View>
        )}

        {activeTab === 'notes' && (
          <View>
            {/* Add Note */}
            <Card style={styles.card}>
              <View style={styles.noteTypeRow}>
                {(['general', 'pro', 'con'] as NoteType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.noteTypeButton, noteType === type && styles.noteTypeButtonActive]}
                    onPress={() => setNoteType(type)}
                  >
                    <Text
                      style={[
                        styles.noteTypeText,
                        noteType === type && styles.noteTypeTextActive,
                      ]}
                    >
                      {type === 'pro' ? '+ Pro' : type === 'con' ? '- Con' : 'Note'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note..."
                value={newNote}
                onChangeText={setNewNote}
                multiline
              />
              <Button title="Add Note" onPress={handleAddNote} size="sm" />
            </Card>

            {/* Notes List */}
            {['pro', 'con', 'general'].map((type) => {
              const notes = property.notes?.filter((n) => n.type === type) || [];
              if (notes.length === 0) return null;

              return (
                <View key={type} style={styles.noteSection}>
                  <Text style={styles.noteSectionTitle}>
                    {type === 'pro' ? 'Pros' : type === 'con' ? 'Cons' : 'Notes'}
                  </Text>
                  {notes.map((note) => (
                    <View
                      key={note.id}
                      style={[
                        styles.noteCard,
                        type === 'pro' && styles.noteCardPro,
                        type === 'con' && styles.noteCardCon,
                      ]}
                    >
                      <Text style={styles.noteContent}>{note.content}</Text>
                      <TouchableOpacity
                        onPress={() => deleteNote(note.id)}
                        style={styles.noteDelete}
                      >
                        <Text style={styles.noteDeleteText}>{'\u00D7'}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'offers' && (
          <View>
            {/* Add Offer Button */}
            <Button
              title="+ Add Offer"
              onPress={() => {
                resetOfferForm();
                setEditingOffer(null);
                setShowOfferModal(true);
              }}
              style={styles.addOfferButton}
            />

            {/* Offers List */}
            {offers.length === 0 ? (
              <Card style={styles.card}>
                <Text style={styles.emptyOffersText}>No offers yet</Text>
                <Text style={styles.emptyOffersSubtext}>
                  Track your offers and their status here
                </Text>
              </Card>
            ) : (
              offers.map((offer) => (
                <Card key={offer.id} style={styles.offerCard}>
                  <View style={styles.offerHeader}>
                    <Text style={styles.offerAmount}>{formatCurrency(offer.amount)}</Text>
                    <View style={[styles.offerStatusBadge, { backgroundColor: getOfferStatusColor(offer.status) + '20' }]}>
                      <Text style={[styles.offerStatusText, { color: getOfferStatusColor(offer.status) }]}>
                        {offer.status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.offerDetails}>
                    <Text style={styles.offerDate}>
                      Submitted: {new Date(offer.offer_date).toLocaleDateString()}
                    </Text>
                    {offer.earnest_money && (
                      <Text style={styles.offerDetail}>Earnest: {formatCurrency(offer.earnest_money)}</Text>
                    )}
                    {offer.expiration_date && (
                      <Text style={styles.offerDetail}>Expires: {offer.expiration_date}</Text>
                    )}
                    {offer.closing_date && (
                      <Text style={styles.offerDetail}>Closing: {offer.closing_date}</Text>
                    )}
                    {offer.notes && (
                      <Text style={styles.offerNotes}>{offer.notes}</Text>
                    )}
                  </View>

                  {/* Status Update Buttons */}
                  <View style={styles.offerActions}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {(['submitted', 'countered', 'accepted', 'rejected', 'withdrawn'] as OfferStatus[]).map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusUpdateButton,
                            offer.status === status && styles.statusUpdateButtonActive,
                          ]}
                          onPress={() => updateOfferStatus(offer.id, status)}
                        >
                          <Text style={[
                            styles.statusUpdateText,
                            offer.status === status && styles.statusUpdateTextActive,
                          ]}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.offerFooter}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingOffer(offer);
                        setOfferForm({
                          amount: offer.amount.toString(),
                          earnest_money: offer.earnest_money?.toString() || '',
                          expiration_date: offer.expiration_date || '',
                          closing_date: offer.closing_date || '',
                          notes: offer.notes || '',
                          contingencies: offer.contingencies || [],
                        });
                        setShowOfferModal(true);
                      }}
                    >
                      <Text style={styles.offerEditText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteOffer(offer.id)}>
                      <Text style={styles.offerDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))
            )}

            {/* Documents Section */}
            <View style={styles.documentsSection}>
              <Text style={styles.sectionTitle}>Documents</Text>
              <Button
                title="+ Add Document"
                variant="outline"
                onPress={handleAddDocument}
                style={styles.addDocButton}
              />

              {documents.length === 0 ? (
                <Text style={styles.emptyDocsText}>
                  Store inspection reports, disclosures, and other documents here
                </Text>
              ) : (
                documents.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.documentCard}
                    onPress={() => openDocument(doc)}
                  >
                    <View style={styles.docIcon}>
                      <Text style={styles.docIconText}>
                        {doc.type === 'inspection' ? '🔍' :
                         doc.type === 'disclosure' ? '📋' :
                         doc.type === 'appraisal' ? '💰' :
                         doc.type === 'contract' ? '📝' : '📄'}
                      </Text>
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                      <Text style={styles.docType}>{doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteDocument(doc.id)}>
                      <Text style={styles.docDelete}>×</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'financials' && (
          <View>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Monthly Payment Breakdown</Text>
              <View style={styles.costBreakdown}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Principal & Interest</Text>
                  <Text style={styles.costValue}>
                    {formatCurrencyWithCents(monthlyCost.principal_interest)}
                  </Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Property Tax</Text>
                  <Text style={styles.costValue}>
                    {formatCurrencyWithCents(monthlyCost.property_tax)}
                  </Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Insurance</Text>
                  <Text style={styles.costValue}>
                    {formatCurrencyWithCents(monthlyCost.insurance)}
                  </Text>
                </View>
                {monthlyCost.hoa > 0 && (
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>HOA</Text>
                    <Text style={styles.costValue}>
                      {formatCurrencyWithCents(monthlyCost.hoa)}
                    </Text>
                  </View>
                )}
                {monthlyCost.pmi > 0 && (
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>PMI</Text>
                    <Text style={styles.costValue}>
                      {formatCurrencyWithCents(monthlyCost.pmi)}
                    </Text>
                  </View>
                )}
                <View style={[styles.costRow, styles.costTotal]}>
                  <Text style={styles.costTotalLabel}>Total Monthly</Text>
                  <Text style={styles.costTotalValue}>
                    {formatCurrencyWithCents(monthlyCost.total)}
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Assumptions</Text>
              <View style={styles.assumptions}>
                <Text style={styles.assumptionText}>
                  Down Payment: {calculatorDefaults.downPaymentPercent}% (
                  {formatCurrency(property.price * (calculatorDefaults.downPaymentPercent / 100))})
                </Text>
                <Text style={styles.assumptionText}>
                  Interest Rate: {calculatorDefaults.interestRate}%
                </Text>
                <Text style={styles.assumptionText}>
                  Loan Term: {calculatorDefaults.loanTermYears} years
                </Text>
              </View>
              <Button
                title="Open Calculator"
                variant="outline"
                onPress={() => navigation.getParent()?.navigate('Calculators')}
                size="sm"
                style={styles.calculatorButton}
              />
            </Card>
          </View>
        )}

      </ScrollView>

      {/* Floating AI Analysis Button */}
      <TouchableOpacity
        style={[styles.aiButton, analysis && styles.aiButtonCompleted]}
        onPress={() => {
          setShowAnalysisModal(true);
          // Only auto-run if no saved analysis and not currently loading/analyzing
          if (!analysis && !isAnalyzing && !isLoadingAnalysis) {
            handleAnalyze();
          }
        }}
      >
        <Text style={styles.aiButtonIcon}>{analysis ? '✓' : '✨'}</Text>
      </TouchableOpacity>

      {/* AI Analysis Modal */}
      <Modal
        visible={showAnalysisModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAnalysisModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>AI Analysis</Text>
              {analysisMetadata && !isAnalyzing && (
                <Text style={styles.analysisTimestamp}>
                  Analyzed {new Date(analysisMetadata.analyzedAt).toLocaleDateString()}
                  {analysisMetadata.hasFinancialContext ? ' • With financials' : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAnalysisModal(false)}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
            {/* Show prompt to add financials if not configured */}
            {analysis && !analysisMetadata?.hasFinancialContext && hasFinancialData && (
              <View style={styles.financialPrompt}>
                <Text style={styles.financialPromptIcon}>💰</Text>
                <View style={styles.financialPromptContent}>
                  <Text style={styles.financialPromptTitle}>Financial profile added!</Text>
                  <Text style={styles.financialPromptText}>
                    Re-run analysis to get personalized affordability and investment recommendations.
                  </Text>
                </View>
              </View>
            )}

            {isAnalyzing && (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.analyzingText}>Analyzing property...</Text>
                <Text style={styles.analyzingSubtext}>
                  {hasFinancialData ? 'Including personalized financial analysis...' : 'This may take a moment'}
                </Text>
              </View>
            )}

            {analysisError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{analysisError}</Text>
                <Button
                  title="Try Again"
                  onPress={handleAnalyze}
                  variant="outline"
                  style={styles.retryButton}
                />
              </View>
            )}

            {analysis && !isAnalyzing && (
              <View>
                {/* Summary */}
                <View style={styles.analysisSection}>
                  <Text style={styles.analysisSectionTitle}>Summary</Text>
                  <Text style={styles.analysisSummary}>{analysis.summary || 'No summary available'}</Text>
                </View>

                {/* Pros */}
                {Array.isArray(analysis.pros) && analysis.pros.length > 0 && (
                  <View style={[styles.analysisSection, styles.prosSection]}>
                    <Text style={styles.analysisSectionTitle}>Pros</Text>
                    {analysis.pros.map((pro, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <Text style={styles.proIcon}>+</Text>
                        <Text style={styles.bulletText}>{String(pro)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Cons */}
                {Array.isArray(analysis.cons) && analysis.cons.length > 0 && (
                  <View style={[styles.analysisSection, styles.consSection]}>
                    <Text style={styles.analysisSectionTitle}>Cons</Text>
                    {analysis.cons.map((con, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <Text style={styles.conIcon}>-</Text>
                        <Text style={styles.bulletText}>{String(con)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Value Assessment */}
                {analysis.valueAssessment && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>Value Assessment</Text>
                    <Text style={styles.analysisText}>{analysis.valueAssessment}</Text>
                  </View>
                )}

                {/* Market Comparison */}
                {analysis.marketComparison && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>Market Comparison</Text>
                    <Text style={styles.analysisText}>{analysis.marketComparison}</Text>
                  </View>
                )}

                {/* Recommendations */}
                {Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>Recommendations</Text>
                    {analysis.recommendations.map((rec, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <Text style={styles.bulletIcon}>•</Text>
                        <Text style={styles.bulletText}>{String(rec)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Risk Factors */}
                {Array.isArray(analysis.riskFactors) && analysis.riskFactors.length > 0 && (
                  <View style={[styles.analysisSection, styles.riskSection]}>
                    <Text style={styles.analysisSectionTitle}>Risk Factors</Text>
                    {analysis.riskFactors.map((risk, idx) => (
                      <View key={idx} style={styles.bulletItem}>
                        <Text style={styles.riskIcon}>⚠</Text>
                        <Text style={styles.bulletText}>{String(risk)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Investment Potential */}
                {analysis.investmentPotential && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>Investment Potential</Text>
                    <Text style={styles.analysisText}>{analysis.investmentPotential}</Text>
                  </View>
                )}

                {/* Financial Analysis Sections */}
                {analysis.affordabilityAnalysis && (
                  <View style={[styles.analysisSection, styles.financialSection]}>
                    <Text style={styles.analysisSectionTitle}>Affordability Analysis</Text>
                    <View style={styles.financialMetrics}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Monthly Payment</Text>
                        <Text style={styles.metricValue}>
                          {formatCurrency(analysis.affordabilityAnalysis.monthlyPaymentEstimate)}
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>DTI Ratio</Text>
                        <Text style={styles.metricValue}>
                          {Math.round(analysis.affordabilityAnalysis.dtiRatio * 100)}%
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Verdict</Text>
                        <Text style={[
                          styles.metricValue,
                          analysis.affordabilityAnalysis.affordabilityVerdict === 'comfortable' && styles.verdictGood,
                          analysis.affordabilityAnalysis.affordabilityVerdict === 'stretched' && styles.verdictWarning,
                          analysis.affordabilityAnalysis.affordabilityVerdict === 'risky' && styles.verdictDanger,
                          analysis.affordabilityAnalysis.affordabilityVerdict === 'unaffordable' && styles.verdictDanger,
                        ]}>
                          {analysis.affordabilityAnalysis.affordabilityVerdict.charAt(0).toUpperCase() + analysis.affordabilityAnalysis.affordabilityVerdict.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.analysisText}>{analysis.affordabilityAnalysis.explanation}</Text>
                  </View>
                )}

                {analysis.investmentAnalysis && (
                  <View style={[styles.analysisSection, styles.financialSection]}>
                    <Text style={styles.analysisSectionTitle}>Investment Analysis</Text>
                    <View style={styles.financialMetrics}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Appreciation</Text>
                        <Text style={styles.metricValue}>{analysis.investmentAnalysis.expectedAppreciation}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Break-even</Text>
                        <Text style={styles.metricValue}>{analysis.investmentAnalysis.breakEvenYears} years</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Recommendation</Text>
                        <Text style={[
                          styles.metricValue,
                          analysis.investmentAnalysis.recommendation === 'strong_buy' && styles.verdictGood,
                          analysis.investmentAnalysis.recommendation === 'buy' && styles.verdictGood,
                          analysis.investmentAnalysis.recommendation === 'hold' && styles.verdictWarning,
                          analysis.investmentAnalysis.recommendation === 'pass' && styles.verdictDanger,
                        ]}>
                          {analysis.investmentAnalysis.recommendation.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    {analysis.investmentAnalysis.rentalPotential && (
                      <Text style={styles.analysisText}>Rental: {analysis.investmentAnalysis.rentalPotential}</Text>
                    )}
                    <Text style={styles.analysisText}>{analysis.investmentAnalysis.rationale}</Text>
                  </View>
                )}

                {analysis.transactionAdvice && (
                  <View style={[styles.analysisSection, styles.financialSection]}>
                    <Text style={styles.analysisSectionTitle}>Transaction Advice</Text>
                    <View style={styles.financialMetrics}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Closing Costs</Text>
                        <Text style={styles.metricValue}>
                          {formatCurrency(analysis.transactionAdvice.closingCostEstimate)}
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Reserves Needed</Text>
                        <Text style={styles.metricValue}>
                          {formatCurrency(analysis.transactionAdvice.reservesNeeded)}
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Ready to Buy</Text>
                        <Text style={[
                          styles.metricValue,
                          analysis.transactionAdvice.readyToBuy ? styles.verdictGood : styles.verdictDanger,
                        ]}>
                          {analysis.transactionAdvice.readyToBuy ? 'Yes' : 'No'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.analysisText}>{analysis.transactionAdvice.offerStrategy}</Text>
                    {Array.isArray(analysis.transactionAdvice.negotiationPoints) && analysis.transactionAdvice.negotiationPoints.length > 0 && (
                      <View style={styles.subSection}>
                        <Text style={styles.subSectionTitle}>Negotiation Points:</Text>
                        {analysis.transactionAdvice.negotiationPoints.map((point, idx) => (
                          <View key={idx} style={styles.bulletItem}>
                            <Text style={styles.bulletIcon}>•</Text>
                            <Text style={styles.bulletText}>{String(point)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {Array.isArray(analysis.transactionAdvice.concerns) && analysis.transactionAdvice.concerns.length > 0 && (
                      <View style={styles.subSection}>
                        <Text style={[styles.subSectionTitle, { color: colors.error }]}>Concerns:</Text>
                        {analysis.transactionAdvice.concerns.map((concern, idx) => (
                          <View key={idx} style={styles.bulletItem}>
                            <Text style={styles.riskIcon}>⚠</Text>
                            <Text style={styles.bulletText}>{String(concern)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Re-analyze section */}
                <View style={styles.reanalyzeSection}>
                  <Text style={styles.reanalyzeSectionTitle}>Update Analysis</Text>
                  <Text style={styles.reanalyzeSectionText}>
                    {!analysisMetadata?.hasFinancialContext && hasFinancialData
                      ? 'Your financial profile is now available. Re-run to get personalized recommendations.'
                      : 'Re-run analysis if property details, pricing, or your financial situation has changed.'}
                  </Text>
                  <Button
                    title={!analysisMetadata?.hasFinancialContext && hasFinancialData
                      ? "Run with Financial Analysis"
                      : "Re-analyze Property"}
                    onPress={handleAnalyze}
                    variant={!analysisMetadata?.hasFinancialContext && hasFinancialData ? "primary" : "outline"}
                    fullWidth
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Offer Modal */}
      <Modal
        visible={showOfferModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOfferModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingOffer ? 'Edit Offer' : 'New Offer'}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowOfferModal(false);
                setEditingOffer(null);
                resetOfferForm();
              }}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.offerFormContent}>
            <View style={styles.offerFormGroup}>
              <Text style={styles.offerFormLabel}>Offer Amount *</Text>
              <TextInput
                style={styles.offerFormInput}
                placeholder="500000"
                value={offerForm.amount}
                onChangeText={(v) => setOfferForm({ ...offerForm, amount: v.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.offerFormGroup}>
              <Text style={styles.offerFormLabel}>Earnest Money Deposit</Text>
              <TextInput
                style={styles.offerFormInput}
                placeholder="10000"
                value={offerForm.earnest_money}
                onChangeText={(v) => setOfferForm({ ...offerForm, earnest_money: v.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.offerFormGroup}>
              <Text style={styles.offerFormLabel}>Offer Expiration Date</Text>
              <TextInput
                style={styles.offerFormInput}
                placeholder="MM/DD/YYYY"
                value={offerForm.expiration_date}
                onChangeText={(v) => setOfferForm({ ...offerForm, expiration_date: v })}
              />
            </View>

            <View style={styles.offerFormGroup}>
              <Text style={styles.offerFormLabel}>Proposed Closing Date</Text>
              <TextInput
                style={styles.offerFormInput}
                placeholder="MM/DD/YYYY"
                value={offerForm.closing_date}
                onChangeText={(v) => setOfferForm({ ...offerForm, closing_date: v })}
              />
            </View>

            <View style={styles.offerFormGroup}>
              <Text style={styles.offerFormLabel}>Contingencies</Text>
              <View style={styles.contingencyList}>
                {['Financing', 'Inspection', 'Appraisal', 'Sale of Home'].map((cont) => (
                  <TouchableOpacity
                    key={cont}
                    style={[
                      styles.contingencyChip,
                      offerForm.contingencies.includes(cont) && styles.contingencyChipActive,
                    ]}
                    onPress={() => {
                      const newCont = offerForm.contingencies.includes(cont)
                        ? offerForm.contingencies.filter((c) => c !== cont)
                        : [...offerForm.contingencies, cont];
                      setOfferForm({ ...offerForm, contingencies: newCont });
                    }}
                  >
                    <Text style={[
                      styles.contingencyText,
                      offerForm.contingencies.includes(cont) && styles.contingencyTextActive,
                    ]}>
                      {offerForm.contingencies.includes(cont) ? '✓ ' : ''}{cont}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.offerFormGroup}>
              <Text style={styles.offerFormLabel}>Notes</Text>
              <TextInput
                style={[styles.offerFormInput, styles.offerFormTextarea]}
                placeholder="Additional terms, conditions, or notes..."
                value={offerForm.notes}
                onChangeText={(v) => setOfferForm({ ...offerForm, notes: v })}
                multiline
                numberOfLines={4}
              />
            </View>

            <Button
              title={editingOffer ? 'Update Offer' : 'Create Offer'}
              onPress={() => saveOffer({})}
              fullWidth
              style={styles.saveOfferButton}
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
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  price: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  address: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginTop: 2,
  },
  location: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  editButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  editButtonText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusArrow: {
    fontSize: 10,
    color: colors.textMuted,
  },
  ratings: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  ratingBox: {
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 4,
  },
  statusPicker: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusOption: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
  },
  statusOptionActive: {
    backgroundColor: colors.primary,
  },
  statusOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusOptionTextActive: {
    color: colors.textInverse,
  },
  tabContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md - 2,
  },
  segmentedTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedTabFirst: {
    borderTopLeftRadius: borderRadius.md - 2,
    borderBottomLeftRadius: borderRadius.md - 2,
  },
  segmentedTabLast: {
    borderTopRightRadius: borderRadius.md - 2,
    borderBottomRightRadius: borderRadius.md - 2,
  },
  segmentedTabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  segmentedTabTextActive: {
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  remarksText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  featureList: {
    marginTop: spacing.xs,
  },
  featureItem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  currentTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tagChipText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  tagRemove: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 2,
  },
  quickTagsLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickTagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  quickTagChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickTagChipActive: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
  quickTagText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  quickTagTextActive: {
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  addTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  addTagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSize.sm,
  },
  addTagButton: {
    marginLeft: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagButtonText: {
    color: colors.textInverse,
    fontSize: 18,
  },
  totalCost: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  costNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  deleteButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  addPhotoButton: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addPhotoText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  pastePhotoButton: {
    flex: 1,
    backgroundColor: colors.primary + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pastePhotoText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  photoHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photo: {
    width: '48%',
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.md,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
  noteTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  noteTypeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
  },
  noteTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  noteTypeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  noteTypeTextActive: {
    color: colors.textInverse,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    minHeight: 80,
    marginBottom: spacing.md,
    textAlignVertical: 'top',
  },
  noteSection: {
    marginBottom: spacing.lg,
  },
  noteSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  noteCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
  },
  noteCardPro: {
    borderLeftColor: colors.success,
    backgroundColor: colors.success + '08',
  },
  noteCardCon: {
    borderLeftColor: colors.error,
    backgroundColor: colors.error + '08',
  },
  noteContent: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  noteDelete: {
    padding: spacing.xs,
  },
  noteDeleteText: {
    fontSize: 18,
    color: colors.textMuted,
  },
  costBreakdown: {
    gap: spacing.sm,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  costLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  costValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  costTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  costTotalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  costTotalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  assumptions: {
    gap: spacing.xs,
  },
  assumptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  calculatorButton: {
    marginTop: spacing.md,
  },
  // Floating AI Button
  aiButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  aiButtonIcon: {
    fontSize: 24,
  },
  aiButtonDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  aiButtonCompleted: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
  },
  // AI Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  modalCloseButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  modalCloseText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  modalContent: {
    flex: 1,
  },
  modalContentInner: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  analyzingContainer: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  analyzingText: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    fontWeight: fontWeight.medium,
  },
  analyzingSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    minWidth: 120,
  },
  analysisSection: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  analysisSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  analysisSummary: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  analysisText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  prosSection: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  consSection: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  riskSection: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  bulletIcon: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginRight: spacing.sm,
    width: 16,
  },
  proIcon: {
    fontSize: fontSize.md,
    color: colors.success,
    marginRight: spacing.sm,
    width: 16,
    fontWeight: fontWeight.bold,
  },
  conIcon: {
    fontSize: fontSize.md,
    color: colors.error,
    marginRight: spacing.sm,
    width: 16,
    fontWeight: fontWeight.bold,
  },
  riskIcon: {
    fontSize: fontSize.md,
    color: colors.warning,
    marginRight: spacing.sm,
    width: 16,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  reanalyzeButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  financialSection: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  financialMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  metricItem: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  verdictGood: {
    color: colors.success,
  },
  verdictWarning: {
    color: colors.warning,
  },
  verdictDanger: {
    color: colors.error,
  },
  subSection: {
    marginTop: spacing.md,
  },
  subSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  analysisTimestamp: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  financialPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  financialPromptIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  financialPromptContent: {
    flex: 1,
  },
  financialPromptTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  financialPromptText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  reanalyzeSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reanalyzeSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  reanalyzeSectionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  // Offers & Documents styles
  addOfferButton: {
    marginBottom: spacing.md,
  },
  emptyOffersText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyOffersSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  offerCard: {
    marginBottom: spacing.md,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  offerAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  offerStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  offerStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  offerDetails: {
    marginBottom: spacing.sm,
  },
  offerDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  offerDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  offerNotes: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  offerActions: {
    marginBottom: spacing.sm,
  },
  statusUpdateButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    marginRight: spacing.xs,
  },
  statusUpdateButtonActive: {
    backgroundColor: colors.primary,
  },
  statusUpdateText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statusUpdateTextActive: {
    color: colors.textInverse,
    fontWeight: fontWeight.semibold,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  offerEditText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  offerDeleteText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  documentsSection: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  addDocButton: {
    marginBottom: spacing.md,
  },
  emptyDocsText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  docIconText: {
    fontSize: 20,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  docType: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  docDelete: {
    fontSize: 24,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
  },
  // Offer Modal styles
  offerFormContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  offerFormGroup: {
    marginBottom: spacing.lg,
  },
  offerFormLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  offerFormInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    backgroundColor: colors.surface,
  },
  offerFormTextarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  contingencyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contingencyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contingencyChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  contingencyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contingencyTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  saveOfferButton: {
    marginTop: spacing.md,
  },
});
