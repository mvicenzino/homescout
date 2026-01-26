import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Button } from './ui';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { formatCurrency } from '../lib/formatters';
import {
  generateTourChecklist,
  TourChecklist,
  getTourChecklist,
  saveTourChecklist,
  generateNegotiationStrategy,
  NegotiationStrategy,
  analyzeNeighborhood,
  NeighborhoodAnalysis,
  analyzeCoupleCompatibility,
  CoupleCompatibilityAnalysis,
  PartnerPreferences,
} from '../lib/openai';
import { Property, HomeBuyerProfile, FinancialProfile } from '../types';

interface Props {
  property: Property;
  buyerProfile?: HomeBuyerProfile;
  financialProfile?: FinancialProfile;
  hasApiKey: boolean;
  partnerProfiles?: PartnerPreferences[];
  commuteDestinations?: Array<{ name: string; address: string }>;
}

type FeatureTab = 'tour' | 'negotiate' | 'neighborhood' | 'couple';

export function AIIntelligence({
  property,
  buyerProfile,
  financialProfile,
  hasApiKey,
  partnerProfiles,
  commuteDestinations,
}: Props) {
  const [activeFeature, setActiveFeature] = useState<FeatureTab | null>(null);

  // Tour Checklist State
  const [tourChecklist, setTourChecklist] = useState<TourChecklist | null>(null);
  const [isLoadingTour, setIsLoadingTour] = useState(false);
  const [tourError, setTourError] = useState<string | null>(null);

  // Negotiation State
  const [negotiation, setNegotiation] = useState<NegotiationStrategy | null>(null);
  const [isLoadingNegotiation, setIsLoadingNegotiation] = useState(false);
  const [negotiationError, setNegotiationError] = useState<string | null>(null);

  // Neighborhood State
  const [neighborhood, setNeighborhood] = useState<NeighborhoodAnalysis | null>(null);
  const [isLoadingNeighborhood, setIsLoadingNeighborhood] = useState(false);
  const [neighborhoodError, setNeighborhoodError] = useState<string | null>(null);

  // Couple Compatibility State
  const [coupleAnalysis, setCoupleAnalysis] = useState<CoupleCompatibilityAnalysis | null>(null);
  const [isLoadingCouple, setIsLoadingCouple] = useState(false);
  const [coupleError, setCoupleError] = useState<string | null>(null);

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, [property.id]);

  const loadSavedData = async () => {
    try {
      const [savedTour, savedNegotiation, savedNeighborhood, savedCouple] = await Promise.all([
        getTourChecklist(property.id),
        AsyncStorage.getItem(`negotiation_${property.id}`),
        AsyncStorage.getItem(`neighborhood_${property.id}`),
        AsyncStorage.getItem(`couple_analysis_${property.id}`),
      ]);

      if (savedTour) setTourChecklist(savedTour.checklist);
      if (savedNegotiation) setNegotiation(JSON.parse(savedNegotiation));
      if (savedNeighborhood) setNeighborhood(JSON.parse(savedNeighborhood));
      if (savedCouple) setCoupleAnalysis(JSON.parse(savedCouple));
    } catch (error) {
      console.error('Error loading saved AI data:', error);
    }
  };

  const handleGenerateTourChecklist = async () => {
    setIsLoadingTour(true);
    setTourError(null);

    const result = await generateTourChecklist(property, buyerProfile);

    if (result.error) {
      setTourError(result.error);
    } else if (result.data) {
      setTourChecklist(result.data);
      await saveTourChecklist(property.id, result.data);
    }

    setIsLoadingTour(false);
  };

  const handleGenerateNegotiation = async () => {
    setIsLoadingNegotiation(true);
    setNegotiationError(null);

    const result = await generateNegotiationStrategy(property, financialProfile);

    if (result.error) {
      setNegotiationError(result.error);
    } else if (result.data) {
      setNegotiation(result.data);
      await AsyncStorage.setItem(`negotiation_${property.id}`, JSON.stringify(result.data));
    }

    setIsLoadingNegotiation(false);
  };

  const handleAnalyzeNeighborhood = async () => {
    setIsLoadingNeighborhood(true);
    setNeighborhoodError(null);

    const result = await analyzeNeighborhood(property, commuteDestinations);

    if (result.error) {
      setNeighborhoodError(result.error);
    } else if (result.data) {
      setNeighborhood(result.data);
      await AsyncStorage.setItem(`neighborhood_${property.id}`, JSON.stringify(result.data));
    }

    setIsLoadingNeighborhood(false);
  };

  const handleAnalyzeCouple = async () => {
    if (!partnerProfiles || partnerProfiles.length < 2) {
      Alert.alert('Setup Required', 'Couple analysis requires two partner profiles to be configured.');
      return;
    }

    setIsLoadingCouple(true);
    setCoupleError(null);

    const result = await analyzeCoupleCompatibility(property, partnerProfiles[0], partnerProfiles[1]);

    if (result.error) {
      setCoupleError(result.error);
    } else if (result.data) {
      setCoupleAnalysis(result.data);
      await AsyncStorage.setItem(`couple_analysis_${property.id}`, JSON.stringify(result.data));
    }

    setIsLoadingCouple(false);
  };

  if (!hasApiKey) {
    return null;
  }

  const features: { key: FeatureTab; icon: string; label: string; description: string }[] = [
    {
      key: 'tour',
      icon: '📋',
      label: 'Tour Checklist',
      description: 'AI-generated checklist for property showing',
    },
    {
      key: 'negotiate',
      icon: '🎯',
      label: 'Negotiation Strategy',
      description: 'Smart offer and negotiation advice',
    },
    {
      key: 'neighborhood',
      icon: '🏘️',
      label: 'Neighborhood Analysis',
      description: 'Lifestyle and area insights',
    },
    {
      key: 'couple',
      icon: '💑',
      label: 'Couple Match',
      description: 'How well this fits both partners',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>AI Intelligence Tools</Text>
      <Text style={styles.sectionSubtitle}>Advanced AI-powered insights for this property</Text>

      {/* Feature Cards */}
      <View style={styles.featureGrid}>
        {features.map((feature) => {
          const isActive = activeFeature === feature.key;
          const hasData =
            (feature.key === 'tour' && tourChecklist) ||
            (feature.key === 'negotiate' && negotiation) ||
            (feature.key === 'neighborhood' && neighborhood) ||
            (feature.key === 'couple' && coupleAnalysis);

          return (
            <TouchableOpacity
              key={feature.key}
              style={[
                styles.featureCard,
                isActive && styles.featureCardActive,
                hasData && styles.featureCardCompleted,
              ]}
              onPress={() => setActiveFeature(isActive ? null : feature.key)}
            >
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={[styles.featureLabel, isActive && styles.featureLabelActive]}>
                {feature.label}
              </Text>
              {hasData && <Text style={styles.featureCheck}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tour Checklist Panel */}
      {activeFeature === 'tour' && (
        <Card style={styles.panelCard}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Tour Checklist</Text>
            <Button
              title={isLoadingTour ? 'Generating...' : (tourChecklist ? 'Regenerate' : 'Generate')}
              variant={tourChecklist ? 'outline' : 'primary'}
              onPress={handleGenerateTourChecklist}
              loading={isLoadingTour}
              size="sm"
            />
          </View>

          {isLoadingTour && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Creating your personalized tour checklist...</Text>
            </View>
          )}

          {tourError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{tourError}</Text>
            </View>
          )}

          {tourChecklist && !isLoadingTour && (
            <ScrollView style={styles.checklistScroll} nestedScrollEnabled>
              {tourChecklist.criticalQuestions?.length > 0 && (
                <View style={styles.checklistSection}>
                  <Text style={styles.checklistSectionTitle}>Critical Questions</Text>
                  {tourChecklist.criticalQuestions.map((item, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <Text style={styles.checklistIcon}>❓</Text>
                      <Text style={styles.checklistText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {tourChecklist.inspectionPoints?.length > 0 && (
                <View style={styles.checklistSection}>
                  <Text style={styles.checklistSectionTitle}>Inspection Points</Text>
                  {tourChecklist.inspectionPoints.map((item, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <Text style={styles.checklistIcon}>🔍</Text>
                      <Text style={styles.checklistText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {tourChecklist.redFlagsToWatch?.length > 0 && (
                <View style={styles.checklistSection}>
                  <Text style={[styles.checklistSectionTitle, { color: colors.error }]}>Red Flags to Watch</Text>
                  {tourChecklist.redFlagsToWatch.map((item, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <Text style={styles.checklistIcon}>🚩</Text>
                      <Text style={styles.checklistText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {tourChecklist.photosToTake?.length > 0 && (
                <View style={styles.checklistSection}>
                  <Text style={styles.checklistSectionTitle}>Photos to Take</Text>
                  {tourChecklist.photosToTake.map((item, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <Text style={styles.checklistIcon}>📷</Text>
                      <Text style={styles.checklistText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {tourChecklist.questionsForAgent?.length > 0 && (
                <View style={styles.checklistSection}>
                  <Text style={styles.checklistSectionTitle}>Questions for Agent</Text>
                  {tourChecklist.questionsForAgent.map((item, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <Text style={styles.checklistIcon}>🗣️</Text>
                      <Text style={styles.checklistText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          {!tourChecklist && !isLoadingTour && !tourError && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>
                Generate a personalized checklist for touring this property
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Negotiation Strategy Panel */}
      {activeFeature === 'negotiate' && (
        <Card style={styles.panelCard}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Negotiation Strategy</Text>
            <Button
              title={isLoadingNegotiation ? 'Analyzing...' : (negotiation ? 'Refresh' : 'Analyze')}
              variant={negotiation ? 'outline' : 'primary'}
              onPress={handleGenerateNegotiation}
              loading={isLoadingNegotiation}
              size="sm"
            />
          </View>

          {isLoadingNegotiation && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Analyzing market conditions...</Text>
            </View>
          )}

          {negotiationError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{negotiationError}</Text>
            </View>
          )}

          {negotiation && !isLoadingNegotiation && (
            <ScrollView style={styles.checklistScroll} nestedScrollEnabled>
              {/* Market Position */}
              <View style={styles.negotiationSection}>
                <View style={[
                  styles.marketBadge,
                  { backgroundColor:
                    negotiation.marketPosition === 'buyer_market' ? colors.success + '20' :
                    negotiation.marketPosition === 'seller_market' ? colors.error + '20' :
                    colors.warning + '20'
                  }
                ]}>
                  <Text style={[
                    styles.marketBadgeText,
                    { color:
                      negotiation.marketPosition === 'buyer_market' ? colors.success :
                      negotiation.marketPosition === 'seller_market' ? colors.error :
                      colors.warning
                    }
                  ]}>
                    {negotiation.marketPosition.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Suggested Offers */}
              <View style={styles.negotiationSection}>
                <Text style={styles.checklistSectionTitle}>Suggested Offer Range</Text>
                <View style={styles.offerRange}>
                  <View style={styles.offerRangeItem}>
                    <Text style={styles.offerLabel}>Lowball</Text>
                    <Text style={styles.offerValue}>{formatCurrency(negotiation.suggestedOfferRange.lowball)}</Text>
                    <Text style={styles.offerPercent}>{negotiation.suggestedOfferPercent.lowball}%</Text>
                  </View>
                  <View style={[styles.offerRangeItem, styles.offerRangeItemHighlight]}>
                    <Text style={styles.offerLabel}>Competitive</Text>
                    <Text style={[styles.offerValue, { color: colors.primary }]}>
                      {formatCurrency(negotiation.suggestedOfferRange.competitive)}
                    </Text>
                    <Text style={styles.offerPercent}>{negotiation.suggestedOfferPercent.competitive}%</Text>
                  </View>
                  <View style={styles.offerRangeItem}>
                    <Text style={styles.offerLabel}>Aggressive</Text>
                    <Text style={styles.offerValue}>{formatCurrency(negotiation.suggestedOfferRange.aggressive)}</Text>
                    <Text style={styles.offerPercent}>{negotiation.suggestedOfferPercent.aggressive}%</Text>
                  </View>
                </View>
              </View>

              {/* Walk Away Point */}
              <View style={styles.negotiationSection}>
                <Text style={styles.checklistSectionTitle}>Walk Away Point</Text>
                <Text style={styles.walkAwayValue}>{formatCurrency(negotiation.walkAwayPoint)}</Text>
              </View>

              {/* Negotiation Levers */}
              {negotiation.negotiationLevers?.length > 0 && (
                <View style={styles.negotiationSection}>
                  <Text style={styles.checklistSectionTitle}>Negotiation Leverage Points</Text>
                  {negotiation.negotiationLevers.map((item, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <Text style={styles.checklistIcon}>💪</Text>
                      <Text style={styles.checklistText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Timing Advice */}
              {negotiation.timingAdvice && (
                <View style={styles.negotiationSection}>
                  <Text style={styles.checklistSectionTitle}>Timing Advice</Text>
                  <Text style={styles.bodyText}>{negotiation.timingAdvice}</Text>
                </View>
              )}

              {/* Rationale */}
              {negotiation.rationale && (
                <View style={styles.negotiationSection}>
                  <Text style={styles.checklistSectionTitle}>Strategy Rationale</Text>
                  <Text style={styles.bodyText}>{negotiation.rationale}</Text>
                </View>
              )}
            </ScrollView>
          )}

          {!negotiation && !isLoadingNegotiation && !negotiationError && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyText}>
                Get AI-powered negotiation strategy and offer recommendations
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Neighborhood Analysis Panel */}
      {activeFeature === 'neighborhood' && (
        <Card style={styles.panelCard}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Neighborhood Analysis</Text>
            <Button
              title={isLoadingNeighborhood ? 'Analyzing...' : (neighborhood ? 'Refresh' : 'Analyze')}
              variant={neighborhood ? 'outline' : 'primary'}
              onPress={handleAnalyzeNeighborhood}
              loading={isLoadingNeighborhood}
              size="sm"
            />
          </View>

          {isLoadingNeighborhood && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Analyzing neighborhood...</Text>
            </View>
          )}

          {neighborhoodError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{neighborhoodError}</Text>
            </View>
          )}

          {neighborhood && !isLoadingNeighborhood && (
            <ScrollView style={styles.checklistScroll} nestedScrollEnabled>
              {/* Score and Label */}
              <View style={styles.neighborhoodHeader}>
                <View style={styles.lifestyleScore}>
                  <Text style={styles.scoreNumber}>{neighborhood.lifestyleScore}</Text>
                  <Text style={styles.scoreLabel}>/ 100</Text>
                </View>
                <View style={styles.lifestyleLabel}>
                  <Text style={styles.lifestyleLabelText}>{neighborhood.lifestyleLabel}</Text>
                  <View style={[
                    styles.walkabilityBadge,
                    { backgroundColor:
                      neighborhood.walkabilityEstimate === 'walkers_paradise' ? colors.success + '20' :
                      neighborhood.walkabilityEstimate === 'very_walkable' ? colors.success + '15' :
                      neighborhood.walkabilityEstimate === 'somewhat_walkable' ? colors.warning + '20' :
                      colors.error + '20'
                    }
                  ]}>
                    <Text style={styles.walkabilityText}>
                      {neighborhood.walkabilityEstimate.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Overview */}
              {neighborhood.overview && (
                <View style={styles.neighborhoodSection}>
                  <Text style={styles.checklistSectionTitle}>Overview</Text>
                  <Text style={styles.bodyText}>{neighborhood.overview}</Text>
                </View>
              )}

              {/* Best For */}
              {neighborhood.bestFor?.length > 0 && (
                <View style={styles.neighborhoodSection}>
                  <Text style={styles.checklistSectionTitle}>Best For</Text>
                  <View style={styles.tagContainer}>
                    {neighborhood.bestFor.map((item, idx) => (
                      <View key={idx} style={styles.tag}>
                        <Text style={styles.tagText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Amenities */}
              {neighborhood.nearbyAmenities?.length > 0 && (
                <View style={styles.neighborhoodSection}>
                  <Text style={styles.checklistSectionTitle}>Nearby Amenities</Text>
                  {neighborhood.nearbyAmenities.map((amenity, idx) => (
                    <View key={idx} style={styles.amenityRow}>
                      <Text style={styles.amenityCategory}>{amenity.category}</Text>
                      <Text style={styles.amenityAssessment}>{amenity.assessment}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Concerns */}
              {neighborhood.concerns?.length > 0 && (
                <View style={styles.neighborhoodSection}>
                  <Text style={[styles.checklistSectionTitle, { color: colors.warning }]}>Considerations</Text>
                  {neighborhood.concerns.map((item, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <Text style={styles.checklistIcon}>⚠️</Text>
                      <Text style={styles.checklistText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Local Tips */}
              {neighborhood.localTips?.length > 0 && (
                <View style={styles.neighborhoodSection}>
                  <Text style={styles.checklistSectionTitle}>Local Tips</Text>
                  {neighborhood.localTips.map((item, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <Text style={styles.checklistIcon}>💡</Text>
                      <Text style={styles.checklistText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          {!neighborhood && !isLoadingNeighborhood && !neighborhoodError && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏘️</Text>
              <Text style={styles.emptyText}>
                Get insights about the neighborhood and local amenities
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Couple Compatibility Panel */}
      {activeFeature === 'couple' && (
        <Card style={styles.panelCard}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Couple Compatibility</Text>
            <Button
              title={isLoadingCouple ? 'Analyzing...' : (coupleAnalysis ? 'Refresh' : 'Analyze')}
              variant={coupleAnalysis ? 'outline' : 'primary'}
              onPress={handleAnalyzeCouple}
              loading={isLoadingCouple}
              size="sm"
              disabled={!partnerProfiles || partnerProfiles.length < 2}
            />
          </View>

          {(!partnerProfiles || partnerProfiles.length < 2) && (
            <View style={styles.setupRequired}>
              <Text style={styles.setupIcon}>💑</Text>
              <Text style={styles.setupText}>
                To use couple compatibility analysis, both partners need to set up their preferences in Settings.
              </Text>
            </View>
          )}

          {isLoadingCouple && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Analyzing compatibility...</Text>
            </View>
          )}

          {coupleError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{coupleError}</Text>
            </View>
          )}

          {coupleAnalysis && !isLoadingCouple && (
            <ScrollView style={styles.checklistScroll} nestedScrollEnabled>
              {/* Compatibility Score */}
              <View style={styles.coupleHeader}>
                <View style={[styles.compatibilityBadge, { backgroundColor: coupleAnalysis.verdictColor + '20' }]}>
                  <Text style={[styles.compatibilityScore, { color: coupleAnalysis.verdictColor }]}>
                    {coupleAnalysis.overallCompatibility}%
                  </Text>
                  <Text style={[styles.compatibilityLabel, { color: coupleAnalysis.verdictColor }]}>
                    {coupleAnalysis.verdictLabel}
                  </Text>
                </View>
              </View>

              {/* Partner Scores */}
              <View style={styles.partnerScores}>
                <View style={styles.partnerScore}>
                  <Text style={styles.partnerName}>{partnerProfiles?.[0]?.name || 'Partner 1'}</Text>
                  <Text style={styles.partnerScoreValue}>{coupleAnalysis.partner1Match.score}%</Text>
                </View>
                <View style={styles.partnerScore}>
                  <Text style={styles.partnerName}>{partnerProfiles?.[1]?.name || 'Partner 2'}</Text>
                  <Text style={styles.partnerScoreValue}>{coupleAnalysis.partner2Match.score}%</Text>
                </View>
              </View>

              {/* Shared Wins */}
              {coupleAnalysis.sharedWins?.length > 0 && (
                <View style={styles.coupleSection}>
                  <Text style={[styles.checklistSectionTitle, { color: colors.success }]}>Shared Wins</Text>
                  {coupleAnalysis.sharedWins.map((item, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <Text style={styles.checklistIcon}>✓</Text>
                      <Text style={styles.checklistText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Discussion Points */}
              {coupleAnalysis.discussionPoints?.length > 0 && (
                <View style={styles.coupleSection}>
                  <Text style={styles.checklistSectionTitle}>Discussion Points</Text>
                  {coupleAnalysis.discussionPoints.map((item, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <Text style={styles.checklistIcon}>💬</Text>
                      <Text style={styles.checklistText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Deal Breaker Alerts */}
              {coupleAnalysis.dealBreakerAlerts?.length > 0 && (
                <View style={styles.coupleSection}>
                  <Text style={[styles.checklistSectionTitle, { color: colors.error }]}>Deal Breaker Alerts</Text>
                  {coupleAnalysis.dealBreakerAlerts.map((item, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <Text style={styles.checklistIcon}>🚫</Text>
                      <Text style={styles.checklistText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Recommendation */}
              {coupleAnalysis.recommendation && (
                <View style={styles.coupleSection}>
                  <Text style={styles.checklistSectionTitle}>Recommendation</Text>
                  <Text style={styles.bodyText}>{coupleAnalysis.recommendation}</Text>
                </View>
              )}
            </ScrollView>
          )}

          {partnerProfiles && partnerProfiles.length >= 2 && !coupleAnalysis && !isLoadingCouple && !coupleError && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💑</Text>
              <Text style={styles.emptyText}>
                See how well this property matches both partners' preferences
              </Text>
            </View>
          )}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  featureCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  featureCardCompleted: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success + '40',
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  featureLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  featureLabelActive: {
    color: colors.primary,
  },
  featureCheck: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  panelCard: {
    marginBottom: spacing.md,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  panelTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  errorContainer: {
    padding: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  checklistScroll: {
    maxHeight: 400,
  },
  checklistSection: {
    marginBottom: spacing.md,
  },
  checklistSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  checklistItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  checklistIcon: {
    width: 24,
    fontSize: fontSize.sm,
  },
  checklistText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  setupRequired: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  setupIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  setupText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  bodyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Negotiation specific styles
  negotiationSection: {
    marginBottom: spacing.md,
  },
  marketBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  marketBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  offerRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  offerRangeItem: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  offerRangeItemHighlight: {
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  offerLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  offerValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  offerPercent: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  walkAwayValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  // Neighborhood specific styles
  neighborhoodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  lifestyleScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  scoreLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  lifestyleLabel: {
    flex: 1,
  },
  lifestyleLabelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  walkabilityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  walkabilityText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  neighborhoodSection: {
    marginBottom: spacing.md,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  amenityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  amenityCategory: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  amenityAssessment: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  // Couple specific styles
  coupleHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  compatibilityBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  compatibilityScore: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
  },
  compatibilityLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  partnerScores: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  partnerScore: {
    alignItems: 'center',
  },
  partnerName: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  partnerScoreValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  coupleSection: {
    marginBottom: spacing.md,
  },
});
