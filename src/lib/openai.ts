import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FinancialProfile } from '../types';

const ANTHROPIC_API_KEY_STORAGE = 'anthropic_api_key';
const ANALYSIS_STORAGE_PREFIX = 'property_analysis_';

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
