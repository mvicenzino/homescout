import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FinancialProfile, HomeBuyerProfile, Property } from '../types';

const ANTHROPIC_API_KEY_STORAGE = 'anthropic_api_key';
const ANALYSIS_STORAGE_PREFIX = 'property_analysis_';
const COUPLE_ANALYSIS_PREFIX = 'couple_analysis_';
const TOUR_CHECKLIST_PREFIX = 'tour_checklist_';

export interface ExtractedPropertyData {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  lot_size?: number;
  year_built?: number;
  garage?: number;
  stories?: number;
  hoa_monthly?: number;
  property_tax_annual?: number;
  insurance_annual?: number;
  mls_number?: string;
  source_url?: string;
}

const IMAGE_EXTRACTION_PROMPT = `Extract property listing information from this image. Return a JSON object with these fields (use null for missing values):

{
  "address": "street address",
  "city": "city name",
  "state": "2-letter state code",
  "zip": "5-digit zip code",
  "price": listing price as number (no commas or $),
  "beds": number of bedrooms,
  "baths": number of bathrooms (can be decimal like 2.5),
  "sqft": square footage as number,
  "lot_size": lot size in sqft as number,
  "year_built": 4-digit year,
  "garage": number of garage spaces,
  "stories": number of stories,
  "hoa_monthly": monthly HOA fee as number,
  "property_tax_annual": annual property tax as number,
  "insurance_annual": annual insurance as number,
  "mls_number": "MLS listing number",
  "source_url": "listing URL if visible"
}

Only return the JSON object, no other text.`;

const TEXT_EXTRACTION_PROMPT = `Extract property listing information from this text. Return a JSON object with these fields (use null for missing values):

{
  "address": "street address",
  "city": "city name",
  "state": "2-letter state code",
  "zip": "5-digit zip code",
  "price": listing price as number (no commas or $),
  "beds": number of bedrooms,
  "baths": number of bathrooms (can be decimal like 2.5),
  "sqft": square footage as number,
  "lot_size": lot size in sqft as number,
  "year_built": 4-digit year,
  "garage": number of garage spaces,
  "stories": number of stories,
  "hoa_monthly": monthly HOA fee as number,
  "property_tax_annual": annual property tax as number,
  "insurance_annual": annual insurance as number,
  "mls_number": "MLS listing number",
  "source_url": "listing URL if present"
}

Only return the JSON object, no other text.`;

export async function getAnthropicApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ANTHROPIC_API_KEY_STORAGE);
  } catch {
    return null;
  }
}

export async function setAnthropicApiKey(key: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ANTHROPIC_API_KEY_STORAGE, key);
  } catch (error) {
    console.error('Failed to save Anthropic API key:', error);
    throw new Error('Failed to save API key');
  }
}

export async function removeAnthropicApiKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ANTHROPIC_API_KEY_STORAGE);
  } catch (error) {
    console.error('Failed to remove Anthropic API key:', error);
  }
}

export async function extractPropertyData(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<{ data?: ExtractedPropertyData; error?: string }> {
  const apiKey = await getAnthropicApiKey();

  if (!apiKey) {
    return { error: 'Anthropic API key not configured. Please add it in Settings.' };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: IMAGE_EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', JSON.stringify(errorData));

      if (response.status === 401) {
        return { error: 'Invalid Anthropic API key. Please check your key in Settings.' };
      }
      if (response.status === 429) {
        return { error: 'Rate limit exceeded. Please try again later.' };
      }

      return { error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return { error: 'No response from Claude' };
    }

    // Parse the JSON response
    try {
      // Clean up the response - remove markdown code blocks if present
      let jsonString = content.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.slice(7);
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.slice(3);
      }
      if (jsonString.endsWith('```')) {
        jsonString = jsonString.slice(0, -3);
      }
      jsonString = jsonString.trim();

      const extracted = JSON.parse(jsonString);

      // Clean up null values and convert strings to numbers where needed
      const cleanData: ExtractedPropertyData = {};

      if (extracted.address) cleanData.address = String(extracted.address);
      if (extracted.city) cleanData.city = String(extracted.city);
      if (extracted.state) cleanData.state = String(extracted.state).toUpperCase();
      if (extracted.zip) cleanData.zip = String(extracted.zip);
      if (extracted.price) cleanData.price = Number(extracted.price);
      if (extracted.beds) cleanData.beds = Number(extracted.beds);
      if (extracted.baths) cleanData.baths = Number(extracted.baths);
      if (extracted.sqft) cleanData.sqft = Number(extracted.sqft);
      if (extracted.lot_size) cleanData.lot_size = Number(extracted.lot_size);
      if (extracted.year_built) cleanData.year_built = Number(extracted.year_built);
      if (extracted.garage) cleanData.garage = Number(extracted.garage);
      if (extracted.stories) cleanData.stories = Number(extracted.stories);
      if (extracted.hoa_monthly) cleanData.hoa_monthly = Number(extracted.hoa_monthly);
      if (extracted.property_tax_annual) cleanData.property_tax_annual = Number(extracted.property_tax_annual);
      if (extracted.insurance_annual) cleanData.insurance_annual = Number(extracted.insurance_annual);
      if (extracted.mls_number) cleanData.mls_number = String(extracted.mls_number);
      if (extracted.source_url) cleanData.source_url = String(extracted.source_url);

      return { data: cleanData };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return { error: 'Failed to parse property data from image' };
    }
  } catch (error: any) {
    console.error('OpenAI request failed:', error);
    return { error: error.message || 'Failed to process image' };
  }
}

export interface PropertyAnalysis {
  summary: string;
  pros: string[];
  cons: string[];
  valueAssessment: string;
  marketComparison: string;
  recommendations: string[];
  riskFactors: string[];
  investmentPotential: string;
  // Financial analysis (when profile is provided)
  affordabilityAnalysis?: {
    monthlyPaymentEstimate: number;
    dtiRatio: number;
    affordabilityVerdict: 'comfortable' | 'stretched' | 'risky' | 'unaffordable';
    explanation: string;
  };
  investmentAnalysis?: {
    expectedAppreciation: string;
    rentalPotential: string;
    breakEvenYears: number;
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'pass';
    rationale: string;
  };
  transactionAdvice?: {
    offerStrategy: string;
    negotiationPoints: string[];
    closingCostEstimate: number;
    reservesNeeded: number;
    readyToBuy: boolean;
    concerns: string[];
  };
}

export interface SavedAnalysis {
  analysis: PropertyAnalysis;
  analyzedAt: string;
  propertyPrice: number;
  hasFinancialContext: boolean;
}

export async function savePropertyAnalysis(
  propertyId: string,
  analysis: PropertyAnalysis,
  propertyPrice: number,
  hasFinancialContext: boolean
): Promise<void> {
  try {
    const savedAnalysis: SavedAnalysis = {
      analysis,
      analyzedAt: new Date().toISOString(),
      propertyPrice,
      hasFinancialContext,
    };
    await AsyncStorage.setItem(
      `${ANALYSIS_STORAGE_PREFIX}${propertyId}`,
      JSON.stringify(savedAnalysis)
    );
  } catch (error) {
    console.error('Failed to save analysis:', error);
  }
}

export async function getPropertyAnalysis(
  propertyId: string
): Promise<SavedAnalysis | null> {
  try {
    const data = await AsyncStorage.getItem(`${ANALYSIS_STORAGE_PREFIX}${propertyId}`);
    if (data) {
      return JSON.parse(data) as SavedAnalysis;
    }
    return null;
  } catch (error) {
    console.error('Failed to load analysis:', error);
    return null;
  }
}

export async function clearPropertyAnalysis(propertyId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${ANALYSIS_STORAGE_PREFIX}${propertyId}`);
  } catch (error) {
    console.error('Failed to clear analysis:', error);
  }
}

export async function analyzeProperty(
  property: Record<string, any>,
  financialProfile?: FinancialProfile
): Promise<{ data?: PropertyAnalysis; error?: string }> {
  const apiKey = await getAnthropicApiKey();

  if (!apiKey) {
    return { error: 'Anthropic API key not configured. Please add it in Settings.' };
  }

  const hasFinancialProfile = financialProfile && (
    financialProfile.annual_household_income ||
    financialProfile.available_down_payment ||
    financialProfile.target_monthly_payment
  );

  const propertyDetails = `
Property Details:
- Address: ${property.address}, ${property.city}, ${property.state} ${property.zip}
- Price: $${property.price?.toLocaleString()}
- Beds: ${property.beds}, Baths: ${property.baths}
- Square Feet: ${property.sqft?.toLocaleString()}
- Price per Sqft: $${property.price && property.sqft ? Math.round(property.price / property.sqft) : 'N/A'}
- Year Built: ${property.year_built || 'Unknown'}
- Lot Size: ${property.lot_size ? property.lot_size.toLocaleString() + ' sqft' : 'Unknown'}
- Property Type: ${property.property_type || 'Unknown'}
- Style: ${property.property_style || 'Unknown'}
- Stories: ${property.stories || 'Unknown'}
- Garage: ${property.garage || 0} car
- HOA Monthly: $${property.hoa_monthly || 0}
- Annual Tax: $${property.property_tax_annual?.toLocaleString() || 'Unknown'}
- County: ${property.county || 'Unknown'}
- Heating: ${property.heating || 'Unknown'}
- Cooling: ${property.cooling || 'Unknown'}
- Basement: ${property.basement || 'None'}
- Interior Features: ${Array.isArray(property.interior_features) ? property.interior_features.join(', ') : 'Unknown'}
- Exterior Features: ${Array.isArray(property.exterior_features) ? property.exterior_features.join(', ') : 'Unknown'}
- Appliances: ${Array.isArray(property.appliances) ? property.appliances.join(', ') : 'Unknown'}
- In-Law Suite: ${property.has_in_law_suite ? 'Yes' : 'No'}
- Days on Market: ${property.days_on_market || 'Unknown'}
- Description: ${property.remarks || 'No description'}
`;

  const financialDetails = hasFinancialProfile ? `
BUYER FINANCIAL PROFILE (Use this for personalized analysis):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Income & Debt:
- Annual Household Income: $${financialProfile.annual_household_income?.toLocaleString() || 'Not provided'}
- Monthly Debt Payments: $${financialProfile.monthly_debt_payments?.toLocaleString() || '0'} (car loans, student loans, credit cards, etc.)

Available Funds:
- Down Payment Available: $${financialProfile.available_down_payment?.toLocaleString() || 'Not provided'}
- Total Savings/Reserves: $${financialProfile.total_savings?.toLocaleString() || 'Not provided'}

Buyer Profile:
- Credit Score: ${financialProfile.credit_score_range ? financialProfile.credit_score_range.toUpperCase() : 'Not provided'}
- First-time Buyer: ${financialProfile.first_time_buyer ? 'Yes (may qualify for special programs)' : 'No'}

Goals:
- Target Monthly Payment: $${financialProfile.target_monthly_payment?.toLocaleString() || 'Not specified'}
- Investment Horizon: ${financialProfile.investment_horizon_years ? financialProfile.investment_horizon_years + ' years' : 'Not specified'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : '';

  const baseAnalysisFields = `{
  "summary": "A 2-3 sentence overall summary of the property",
  "pros": ["list of 3-5 positive aspects"],
  "cons": ["list of 2-4 potential concerns or drawbacks"],
  "valueAssessment": "Assessment of the price relative to features and market (1-2 sentences)",
  "marketComparison": "How this property compares to typical properties in the area (1-2 sentences)",
  "recommendations": ["list of 2-4 actionable recommendations for the buyer"],
  "riskFactors": ["list of 1-3 potential risks or things to investigate further"],
  "investmentPotential": "Brief assessment of long-term value and investment potential (1-2 sentences)"`;

  const financialAnalysisFields = hasFinancialProfile ? `,
  "affordabilityAnalysis": {
    "monthlyPaymentEstimate": estimated total monthly payment including PITI and HOA as number,
    "dtiRatio": calculated debt-to-income ratio as decimal (e.g., 0.35 for 35%),
    "affordabilityVerdict": "comfortable" | "stretched" | "risky" | "unaffordable",
    "explanation": "1-2 sentence explanation of the affordability assessment"
  },
  "investmentAnalysis": {
    "expectedAppreciation": "expected annual appreciation rate and reasoning",
    "rentalPotential": "estimated rental income potential if applicable",
    "breakEvenYears": number of years to break even vs renting,
    "recommendation": "strong_buy" | "buy" | "hold" | "pass",
    "rationale": "2-3 sentence investment recommendation rationale"
  },
  "transactionAdvice": {
    "offerStrategy": "recommended offer strategy based on market and financials",
    "negotiationPoints": ["list of 2-3 points to negotiate on"],
    "closingCostEstimate": estimated closing costs as number,
    "reservesNeeded": recommended cash reserves after purchase as number,
    "readyToBuy": true or false based on financial readiness,
    "concerns": ["list of any financial concerns to address before purchasing"]
  }` : '';

  const financialInstructions = hasFinancialProfile ? `
CRITICAL FINANCIAL ANALYSIS REQUIREMENTS:
1. Calculate DTI using: (monthly debt + estimated mortgage payment) / (annual income / 12)
2. For affordability: "comfortable" = DTI < 28%, "stretched" = 28-36%, "risky" = 36-43%, "unaffordable" = >43%
3. Consider closing costs at 2-5% of purchase price
4. Recommend 3-6 months reserves after closing
5. For first-time buyers, mention FHA/VA loan options if applicable
6. Be direct about whether this is a good financial decision for THIS specific buyer
` : '';

  const prompt = `You are an expert real estate and financial analyst helping a couple find their home. Analyze this property and provide actionable insights.

${propertyDetails}
${financialDetails}
${financialInstructions}

Return a JSON object with this structure:
${baseAnalysisFields}${financialAnalysisFields}
}

${hasFinancialProfile ? `
IMPORTANT: The buyer has shared their financial profile. You MUST:
- Calculate actual numbers based on their income, debts, and available funds
- Give a clear YES/NO recommendation on whether they should pursue this property
- Be honest if this property is outside their comfortable budget
- Explain the long-term financial impact of this purchase
` : ''}

Only return the JSON object, no other text.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: hasFinancialProfile ? 2500 : 1500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', JSON.stringify(errorData));

      if (response.status === 401) {
        return { error: 'Invalid Anthropic API key. Please check your key in Settings.' };
      }
      if (response.status === 429) {
        return { error: 'Rate limit exceeded. Please try again later.' };
      }

      return { error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return { error: 'No response from Claude' };
    }

    try {
      let jsonString = content.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.slice(7);
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.slice(3);
      }
      if (jsonString.endsWith('```')) {
        jsonString = jsonString.slice(0, -3);
      }
      jsonString = jsonString.trim();

      const analysis = JSON.parse(jsonString) as PropertyAnalysis;
      return { data: analysis };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return { error: 'Failed to parse analysis' };
    }
  } catch (error: any) {
    console.error('OpenAI request failed:', error);
    return { error: error.message || 'Failed to analyze property' };
  }
}

export async function extractPropertyFromText(
  text: string
): Promise<{ data?: ExtractedPropertyData; error?: string }> {
  const apiKey = await getAnthropicApiKey();

  if (!apiKey) {
    return { error: 'Anthropic API key not configured. Please add it in Settings.' };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `${TEXT_EXTRACTION_PROMPT}\n\nText to extract from:\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', JSON.stringify(errorData));

      if (response.status === 401) {
        return { error: 'Invalid Anthropic API key. Please check your key in Settings.' };
      }
      if (response.status === 429) {
        return { error: 'Rate limit exceeded. Please try again later.' };
      }

      return { error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return { error: 'No response from Claude' };
    }

    // Parse the JSON response
    try {
      let jsonString = content.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.slice(7);
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.slice(3);
      }
      if (jsonString.endsWith('```')) {
        jsonString = jsonString.slice(0, -3);
      }
      jsonString = jsonString.trim();

      const extracted = JSON.parse(jsonString);

      const cleanData: ExtractedPropertyData = {};

      if (extracted.address) cleanData.address = String(extracted.address);
      if (extracted.city) cleanData.city = String(extracted.city);
      if (extracted.state) cleanData.state = String(extracted.state).toUpperCase();
      if (extracted.zip) cleanData.zip = String(extracted.zip).split('-')[0];
      if (extracted.price) cleanData.price = Number(extracted.price);
      if (extracted.beds) cleanData.beds = Number(extracted.beds);
      if (extracted.baths) cleanData.baths = Number(extracted.baths);
      if (extracted.sqft) cleanData.sqft = Number(extracted.sqft);
      if (extracted.lot_size) cleanData.lot_size = Number(extracted.lot_size);
      if (extracted.year_built && extracted.year_built !== 9999) cleanData.year_built = Number(extracted.year_built);
      if (extracted.garage) cleanData.garage = Number(extracted.garage);
      if (extracted.stories) cleanData.stories = Number(extracted.stories);
      if (extracted.hoa_monthly) cleanData.hoa_monthly = Number(extracted.hoa_monthly);
      if (extracted.property_tax_annual) cleanData.property_tax_annual = Number(extracted.property_tax_annual);
      if (extracted.insurance_annual) cleanData.insurance_annual = Number(extracted.insurance_annual);
      if (extracted.mls_number) cleanData.mls_number = String(extracted.mls_number);
      if (extracted.source_url) cleanData.source_url = String(extracted.source_url);

      return { data: cleanData };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return { error: 'Failed to parse property data from text' };
    }
  } catch (error: any) {
    console.error('OpenAI request failed:', error);
    return { error: error.message || 'Failed to process text' };
  }
}

// ============================================================
// COUPLE COMPATIBILITY ANALYSIS
// ============================================================

export interface CoupleCompatibilityAnalysis {
  overallCompatibility: number; // 0-100
  verdictLabel: 'Perfect Match' | 'Great Fit' | 'Good Compromise' | 'Needs Discussion' | 'Potential Conflict';
  verdictColor: string;
  partner1Match: {
    score: number;
    metPreferences: string[];
    missedPreferences: string[];
    compromises: string[];
  };
  partner2Match: {
    score: number;
    metPreferences: string[];
    missedPreferences: string[];
    compromises: string[];
  };
  sharedWins: string[];
  discussionPoints: string[];
  compromiseSuggestions: string[];
  dealBreakerAlerts: string[];
  recommendation: string;
}

export interface PartnerPreferences {
  name: string;
  profile: HomeBuyerProfile;
}

export async function analyzeCoupleCompatibility(
  property: Property,
  partner1: PartnerPreferences,
  partner2: PartnerPreferences
): Promise<{ data?: CoupleCompatibilityAnalysis; error?: string }> {
  const apiKey = await getAnthropicApiKey();

  if (!apiKey) {
    return { error: 'Anthropic API key not configured. Please add it in Settings.' };
  }

  const propertyDetails = `
Property Details:
- Address: ${property.address}, ${property.city}, ${property.state} ${property.zip}
- Price: $${property.price?.toLocaleString()}
- Beds: ${property.beds}, Baths: ${property.baths}
- Square Feet: ${property.sqft?.toLocaleString()}
- Year Built: ${property.year_built || 'Unknown'}
- Property Type: ${property.property_type || 'Unknown'}
- HOA Monthly: $${property.hoa_monthly || 0}
- Features: ${[...(property.interior_features || []), ...(property.exterior_features || [])].join(', ')}
- Basement: ${property.basement || 'None'}
- Garage: ${property.garage || 0} car
- Description: ${property.remarks || 'No description'}
`;

  const formatProfile = (p: PartnerPreferences) => `
${p.name}'s Preferences:
- Budget: $${p.profile.budget_min?.toLocaleString() || '?'} - $${p.profile.budget_max?.toLocaleString() || '?'}
- Min Beds: ${p.profile.min_beds || 'Any'}
- Min Baths: ${p.profile.min_baths || 'Any'}
- Min Sqft: ${p.profile.min_sqft || 'Any'}
- Preferred Cities: ${p.profile.preferred_cities?.join(', ') || 'Any'}
- Timeline: ${p.profile.timeline || 'Flexible'}
- Must Haves: ${p.profile.must_haves?.join(', ') || 'None specified'}
- Deal Breakers: ${p.profile.deal_breakers?.join(', ') || 'None specified'}
- Property Types: ${p.profile.property_types?.join(', ') || 'Any'}
`;

  const prompt = `You are a relationship-aware real estate advisor helping a couple find their perfect home together. Analyze how well this property matches BOTH partners' preferences.

${propertyDetails}

${formatProfile(partner1)}

${formatProfile(partner2)}

Return a JSON object analyzing the couple's compatibility with this property:

{
  "overallCompatibility": 0-100 score based on how well it satisfies BOTH partners,
  "verdictLabel": "Perfect Match" | "Great Fit" | "Good Compromise" | "Needs Discussion" | "Potential Conflict",
  "verdictColor": hex color for the verdict (green for good, yellow for ok, red for issues),
  "partner1Match": {
    "score": 0-100,
    "metPreferences": ["list of their preferences this property meets"],
    "missedPreferences": ["list of their preferences this property doesn't meet"],
    "compromises": ["things they'd need to compromise on"]
  },
  "partner2Match": {
    "score": 0-100,
    "metPreferences": ["list of their preferences this property meets"],
    "missedPreferences": ["list of their preferences this property doesn't meet"],
    "compromises": ["things they'd need to compromise on"]
  },
  "sharedWins": ["list of things both partners will love about this property"],
  "discussionPoints": ["list of things the couple should discuss before deciding"],
  "compromiseSuggestions": ["suggestions for how to address any gaps - e.g., 'Convert basement to home office'"],
  "dealBreakerAlerts": ["any deal breakers from either partner that this property triggers"],
  "recommendation": "A 2-3 sentence recommendation specifically for this couple"
}

Be empathetic and relationship-aware. Consider how compromises might affect each partner differently. Only return the JSON object.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        return { error: 'Invalid Anthropic API key. Please check your key in Settings.' };
      }
      if (response.status === 429) {
        return { error: 'Rate limit exceeded. Please try again later.' };
      }
      return { error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return { error: 'No response from Claude' };
    }

    try {
      let jsonString = content.trim();
      if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7);
      else if (jsonString.startsWith('```')) jsonString = jsonString.slice(3);
      if (jsonString.endsWith('```')) jsonString = jsonString.slice(0, -3);
      jsonString = jsonString.trim();

      const analysis = JSON.parse(jsonString) as CoupleCompatibilityAnalysis;
      return { data: analysis };
    } catch {
      return { error: 'Failed to parse couple compatibility analysis' };
    }
  } catch (error: any) {
    return { error: error.message || 'Failed to analyze couple compatibility' };
  }
}

export async function saveCoupleAnalysis(
  propertyId: string,
  analysis: CoupleCompatibilityAnalysis
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${COUPLE_ANALYSIS_PREFIX}${propertyId}`,
      JSON.stringify({ analysis, analyzedAt: new Date().toISOString() })
    );
  } catch (error) {
    console.error('Failed to save couple analysis:', error);
  }
}

export async function getCoupleAnalysis(
  propertyId: string
): Promise<{ analysis: CoupleCompatibilityAnalysis; analyzedAt: string } | null> {
  try {
    const data = await AsyncStorage.getItem(`${COUPLE_ANALYSIS_PREFIX}${propertyId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ============================================================
// SMART TOUR CHECKLIST GENERATOR
// ============================================================

export interface TourChecklist {
  criticalQuestions: string[];
  inspectionPoints: string[];
  neighborhoodChecks: string[];
  dealBreakerVerifications: string[];
  photosToTake: string[];
  measurementsToTake: string[];
  questionsForAgent: string[];
  redFlagsToWatch: string[];
  personalizedTips: string[];
}

export async function generateTourChecklist(
  property: Property,
  buyerProfile?: HomeBuyerProfile
): Promise<{ data?: TourChecklist; error?: string }> {
  const apiKey = await getAnthropicApiKey();

  if (!apiKey) {
    return { error: 'Anthropic API key not configured. Please add it in Settings.' };
  }

  const propertyDetails = `
Property to Tour:
- Address: ${property.address}, ${property.city}, ${property.state}
- Price: $${property.price?.toLocaleString()}
- Year Built: ${property.year_built || 'Unknown'}
- Beds: ${property.beds}, Baths: ${property.baths}, Sqft: ${property.sqft}
- Property Type: ${property.property_type || 'Unknown'}
- Days on Market: ${property.days_on_market || 'Unknown'}
- Basement: ${property.basement || 'None'}
- Heating: ${property.heating || 'Unknown'}, Cooling: ${property.cooling || 'Unknown'}
- Roof: ${property.roof || 'Unknown'}
- Description: ${property.remarks || 'No description'}
`;

  const buyerContext = buyerProfile ? `
Buyer's Priorities:
- Must Haves: ${buyerProfile.must_haves?.join(', ') || 'Not specified'}
- Deal Breakers: ${buyerProfile.deal_breakers?.join(', ') || 'Not specified'}
- Min Beds: ${buyerProfile.min_beds || 'Any'}, Min Baths: ${buyerProfile.min_baths || 'Any'}
- Budget: $${buyerProfile.budget_min?.toLocaleString() || '?'} - $${buyerProfile.budget_max?.toLocaleString() || '?'}
` : '';

  const prompt = `You are an expert home inspector and real estate advisor. Generate a comprehensive, personalized tour checklist for this property viewing.

${propertyDetails}
${buyerContext}

Consider the property's age, type, and features when creating the checklist. Be specific to THIS property.

Return a JSON object with these lists:

{
  "criticalQuestions": ["5-7 specific questions to ask about this property"],
  "inspectionPoints": ["8-10 specific areas to inspect carefully given the property's age and features"],
  "neighborhoodChecks": ["4-5 things to observe about the neighborhood during the visit"],
  "dealBreakerVerifications": ["3-5 things to verify based on buyer's deal breakers, if any"],
  "photosToTake": ["6-8 specific photos to take for later review"],
  "measurementsToTake": ["3-5 areas to measure for furniture/planning"],
  "questionsForAgent": ["4-6 questions specifically for the listing agent"],
  "redFlagsToWatch": ["5-7 potential red flags specific to this property type and age"],
  "personalizedTips": ["3-5 personalized tips based on this specific property"]
}

Make items specific and actionable, not generic. Only return the JSON object.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { error: 'Invalid API key' };
      }
      if (response.status === 429) {
        return { error: 'Rate limit exceeded' };
      }
      return { error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return { error: 'No response from Claude' };
    }

    try {
      let jsonString = content.trim();
      if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7);
      else if (jsonString.startsWith('```')) jsonString = jsonString.slice(3);
      if (jsonString.endsWith('```')) jsonString = jsonString.slice(0, -3);
      jsonString = jsonString.trim();

      const checklist = JSON.parse(jsonString) as TourChecklist;
      return { data: checklist };
    } catch {
      return { error: 'Failed to parse tour checklist' };
    }
  } catch (error: any) {
    return { error: error.message || 'Failed to generate tour checklist' };
  }
}

export async function saveTourChecklist(propertyId: string, checklist: TourChecklist): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${TOUR_CHECKLIST_PREFIX}${propertyId}`,
      JSON.stringify({ checklist, generatedAt: new Date().toISOString() })
    );
  } catch (error) {
    console.error('Failed to save tour checklist:', error);
  }
}

export async function getTourChecklist(
  propertyId: string
): Promise<{ checklist: TourChecklist; generatedAt: string } | null> {
  try {
    const data = await AsyncStorage.getItem(`${TOUR_CHECKLIST_PREFIX}${propertyId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ============================================================
// NEGOTIATION INTELLIGENCE
// ============================================================

export interface NegotiationStrategy {
  marketPosition: 'buyer_market' | 'seller_market' | 'balanced';
  suggestedOfferRange: {
    lowball: number;
    competitive: number;
    aggressive: number;
  };
  suggestedOfferPercent: {
    lowball: number;
    competitive: number;
    aggressive: number;
  };
  negotiationLevers: string[];
  timingAdvice: string;
  contingencyRecommendations: string[];
  escalationStrategy: string;
  walkAwayPoint: number;
  closingCostNegotiation: string;
  inspectionStrategy: string;
  riskAssessment: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  rationale: string;
}

export async function generateNegotiationStrategy(
  property: Property,
  financialProfile?: FinancialProfile,
  comparableProperties?: Array<{ price: number; sqft: number; days_on_market?: number }>
): Promise<{ data?: NegotiationStrategy; error?: string }> {
  const apiKey = await getAnthropicApiKey();

  if (!apiKey) {
    return { error: 'Anthropic API key not configured. Please add it in Settings.' };
  }

  const propertyDetails = `
Subject Property:
- Address: ${property.address}, ${property.city}, ${property.state}
- List Price: $${property.price?.toLocaleString()}
- Price/Sqft: $${property.sqft ? Math.round(property.price / property.sqft) : 'N/A'}
- Beds: ${property.beds}, Baths: ${property.baths}, Sqft: ${property.sqft?.toLocaleString()}
- Days on Market: ${property.days_on_market || 'Unknown'}
- Original List Price: $${property.original_list_price?.toLocaleString() || property.price?.toLocaleString()}
- Year Built: ${property.year_built || 'Unknown'}
- Property Type: ${property.property_type || 'Unknown'}
- HOA: $${property.hoa_monthly || 0}/month
`;

  const compContext = comparableProperties?.length ? `
Recent Comparable Sales:
${comparableProperties.map((c, i) => `${i + 1}. $${c.price.toLocaleString()} (${c.sqft} sqft, $${Math.round(c.price / c.sqft)}/sqft, DOM: ${c.days_on_market || '?'})`).join('\n')}
` : '';

  const financialContext = financialProfile ? `
Buyer's Financial Position:
- Pre-approved: ${financialProfile.available_down_payment ? 'Yes' : 'Unknown'}
- Down Payment Available: $${financialProfile.available_down_payment?.toLocaleString() || 'Unknown'}
- Target Monthly Payment: $${financialProfile.target_monthly_payment?.toLocaleString() || 'Unknown'}
- First-time Buyer: ${financialProfile.first_time_buyer ? 'Yes' : 'No'}
` : '';

  const prompt = `You are an expert real estate negotiation strategist. Develop a comprehensive negotiation strategy for this property purchase.

${propertyDetails}
${compContext}
${financialContext}

Analyze the market signals (days on market, price changes, comparable sales) and provide actionable negotiation advice.

Return a JSON object:

{
  "marketPosition": "buyer_market" | "seller_market" | "balanced",
  "suggestedOfferRange": {
    "lowball": starting offer amount in dollars (aggressive low offer),
    "competitive": middle-ground offer in dollars,
    "aggressive": strong offer amount in dollars to beat competition
  },
  "suggestedOfferPercent": {
    "lowball": percent of asking price for lowball (e.g., 92 for 92%),
    "competitive": percent for competitive offer,
    "aggressive": percent for aggressive offer
  },
  "negotiationLevers": ["5-7 specific things to use as negotiation points for this property"],
  "timingAdvice": "advice on timing the offer based on market signals",
  "contingencyRecommendations": ["recommended contingencies and which to potentially waive"],
  "escalationStrategy": "how to structure offer escalation if needed",
  "walkAwayPoint": maximum price in dollars to not exceed,
  "closingCostNegotiation": "strategy for negotiating closing cost credits",
  "inspectionStrategy": "how to handle inspection period strategically",
  "riskAssessment": "assessment of negotiation risks for this property",
  "confidenceLevel": "high" | "medium" | "low" based on available data,
  "rationale": "2-3 sentence explanation of the overall strategy"
}

Be specific to this property's situation. Only return the JSON object.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { error: 'Invalid API key' };
      }
      if (response.status === 429) {
        return { error: 'Rate limit exceeded' };
      }
      return { error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return { error: 'No response from Claude' };
    }

    try {
      let jsonString = content.trim();
      if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7);
      else if (jsonString.startsWith('```')) jsonString = jsonString.slice(3);
      if (jsonString.endsWith('```')) jsonString = jsonString.slice(0, -3);
      jsonString = jsonString.trim();

      const strategy = JSON.parse(jsonString) as NegotiationStrategy;
      return { data: strategy };
    } catch {
      return { error: 'Failed to parse negotiation strategy' };
    }
  } catch (error: any) {
    return { error: error.message || 'Failed to generate negotiation strategy' };
  }
}

// ============================================================
// NEIGHBORHOOD LIFESTYLE ANALYSIS
// ============================================================

export interface NeighborhoodAnalysis {
  lifestyleScore: number; // 0-100
  lifestyleLabel: string;
  overview: string;
  demographics: string;
  safetyAssessment: string;
  walkabilityEstimate: 'car_dependent' | 'somewhat_walkable' | 'very_walkable' | 'walkers_paradise';
  nearbyAmenities: {
    category: string;
    assessment: string;
  }[];
  schoolsAssessment: string;
  commuteConsiderations: string[];
  futureDevelopment: string;
  priceAppreciationOutlook: string;
  bestFor: string[];
  concerns: string[];
  localTips: string[];
}

export async function analyzeNeighborhood(
  property: Property,
  commuteDestinations?: Array<{ name: string; address: string }>
): Promise<{ data?: NeighborhoodAnalysis; error?: string }> {
  const apiKey = await getAnthropicApiKey();

  if (!apiKey) {
    return { error: 'Anthropic API key not configured. Please add it in Settings.' };
  }

  const locationDetails = `
Property Location:
- Address: ${property.address}
- City: ${property.city}
- State: ${property.state}
- Zip: ${property.zip}
- County: ${property.county || 'Unknown'}
- Property Type: ${property.property_type || 'Unknown'}
`;

  const commuteContext = commuteDestinations?.length ? `
Commute Destinations:
${commuteDestinations.map((d, i) => `${i + 1}. ${d.name}: ${d.address}`).join('\n')}
` : '';

  const prompt = `You are a local area expert and relocation advisor. Provide a comprehensive neighborhood analysis for this property location.

${locationDetails}
${commuteContext}

Based on your knowledge of ${property.city}, ${property.state} and the ${property.zip} zip code, provide insights about living in this area.

Return a JSON object:

{
  "lifestyleScore": 0-100 overall neighborhood desirability score,
  "lifestyleLabel": "Urban Hub" | "Suburban Family" | "Quiet Residential" | "Rural Retreat" | "Mixed Use",
  "overview": "2-3 sentence overview of the neighborhood character",
  "demographics": "brief description of typical residents",
  "safetyAssessment": "general safety assessment based on area reputation",
  "walkabilityEstimate": "car_dependent" | "somewhat_walkable" | "very_walkable" | "walkers_paradise",
  "nearbyAmenities": [
    { "category": "Dining", "assessment": "brief assessment" },
    { "category": "Shopping", "assessment": "brief assessment" },
    { "category": "Parks & Recreation", "assessment": "brief assessment" },
    { "category": "Healthcare", "assessment": "brief assessment" },
    { "category": "Entertainment", "assessment": "brief assessment" }
  ],
  "schoolsAssessment": "general assessment of local schools if known",
  "commuteConsiderations": ["3-4 considerations for the commute destinations if provided, or general commute info"],
  "futureDevelopment": "any known or likely future development in the area",
  "priceAppreciationOutlook": "assessment of property value trends in this area",
  "bestFor": ["3-5 types of buyers/lifestyles this area is best suited for"],
  "concerns": ["2-4 potential concerns about living in this area"],
  "localTips": ["3-5 local tips a new resident should know"]
}

Be honest and balanced. Only return the JSON object.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { error: 'Invalid API key' };
      }
      if (response.status === 429) {
        return { error: 'Rate limit exceeded' };
      }
      return { error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return { error: 'No response from Claude' };
    }

    try {
      let jsonString = content.trim();
      if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7);
      else if (jsonString.startsWith('```')) jsonString = jsonString.slice(3);
      if (jsonString.endsWith('```')) jsonString = jsonString.slice(0, -3);
      jsonString = jsonString.trim();

      const analysis = JSON.parse(jsonString) as NeighborhoodAnalysis;
      return { data: analysis };
    } catch {
      return { error: 'Failed to parse neighborhood analysis' };
    }
  } catch (error: any) {
    return { error: error.message || 'Failed to analyze neighborhood' };
  }
}
