// Re-export OpenAI types
export type { ExtractedPropertyData } from '../lib/openai';

// Database types matching Supabase schema

export type PropertyStatus =
  | 'interested'
  | 'toured'
  | 'offer_made'
  | 'under_contract'
  | 'rejected'
  | 'purchased';

export type NoteType = 'pro' | 'con' | 'general';

export interface Household {
  id: string;
  name: string;
  invite_code?: string;
  created_at: string;
  settings: HouseholdSettings;
}

export interface HouseholdSettings {
  commute_destinations?: CommuteDestination[];
  default_interest_rate?: number;
  default_down_payment_percent?: number;
  default_loan_term_years?: number;
  target_dti?: number;
}

export interface CommuteDestination {
  name: string;
  address: string;
}

export interface User {
  id: string;
  household_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  preferences: UserPreferences;
  created_at: string;
}

export interface UserPreferences {
  notifications_enabled?: boolean;
}

export interface Property {
  id: string;
  household_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
  price: number;
  beds: number;
  baths: number;
  full_baths?: number;
  half_baths?: number;
  sqft: number;
  lot_size?: number;
  lot_acres?: number;
  year_built?: number;
  year_renovated?: number;
  garage?: number;
  stories?: number;
  rooms?: number;
  hoa_monthly?: number;
  property_tax_annual?: number;
  tax_year?: number;
  insurance_annual?: number;
  status: PropertyStatus;
  source_url?: string;
  mls_number?: string;
  listing_date?: string;

  // Property Details
  property_type?: string; // Single Family, Condo, Townhouse, etc.
  property_style?: string; // Colonial, Ranch, Cape Cod, etc.

  // Features (stored as JSON)
  interior_features?: string[];
  exterior_features?: string[];
  appliances?: string[];
  flooring?: string[];
  heating?: string;
  cooling?: string;
  basement?: string;
  garage_type?: string[];
  roof?: string;
  sewer?: string;
  water?: string;

  // Lot details
  lot_description?: string[];

  // Special features
  has_in_law_suite?: boolean;
  in_law_features?: string[];

  // Description
  remarks?: string;
  directions?: string;

  // Analysis fields
  original_list_price?: number;
  price_per_sqft?: number;
  days_on_market?: number;
  list_date?: string;
  expiration_date?: string;

  // Tax & Assessment
  tax_rate?: number;
  assessed_value_total?: number;
  assessed_value_land?: number;
  assessed_value_building?: number;

  // Additional details
  age_restricted?: boolean;
  pets_allowed?: boolean;
  short_sale?: boolean;
  ownership_type?: string;

  // More property details
  fireplaces?: number;
  driveway?: string;
  exterior_finish?: string;
  fuel?: string;
  kitchen_features?: string[];
  dining_room?: string;
  block?: string;
  lot_number?: string;

  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  photos?: PropertyPhoto[];
  ratings?: PropertyRating[];
  notes?: PropertyNote[];
  tags?: PropertyTag[];
}

export interface PropertyPhoto {
  id: string;
  property_id: string;
  url: string;
  caption?: string;
  is_primary: boolean;
  uploaded_by: string;
  created_at: string;
}

export interface PropertyRating {
  id: string;
  property_id: string;
  user_id: string;
  rating: number; // 1-5
  created_at: string;
  updated_at: string;
  // Joined
  user?: User;
}

export interface PropertyNote {
  id: string;
  property_id: string;
  user_id: string;
  content: string;
  type: NoteType;
  created_at: string;
  // Joined
  user?: User;
}

export interface PropertyTag {
  id: string;
  property_id: string;
  tag: string;
  created_at: string;
}

export interface Tour {
  id: string;
  property_id: string;
  scheduled_at: string;
  completed: boolean;
  post_tour_notes?: string;
  created_at: string;
}

export type OfferStatus =
  | 'draft'
  | 'submitted'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'withdrawn';

export interface Offer {
  id: string;
  property_id: string;
  amount: number;
  offer_date: string;
  expiration_date?: string;
  status: OfferStatus;
  contingencies?: string[];
  earnest_money?: number;
  closing_date?: string;
  notes?: string;
  counter_amount?: number;
  counter_notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyDocument {
  id: string;
  property_id: string;
  name: string;
  type: 'inspection' | 'disclosure' | 'appraisal' | 'contract' | 'other';
  url: string;
  file_size?: number;
  uploaded_by: string;
  created_at: string;
}

export interface FinancialScenario {
  id: string;
  property_id: string;
  name: string;
  down_payment_amount: number;
  down_payment_percent: number;
  interest_rate: number;
  loan_term_years: number;
  include_pmi: boolean;
  created_at: string;
  updated_at: string;
}

// Calculator types
export interface MortgageCalculation {
  principal: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
}

export interface TotalMonthlyCost {
  principal_interest: number;
  property_tax: number;
  insurance: number;
  hoa: number;
  pmi: number;
  total: number;
}

export interface ClosingCostEstimate {
  loan_origination: number;
  appraisal: number;
  title_insurance: number;
  escrow_fees: number;
  recording_fees: number;
  prepaid_taxes: number;
  prepaid_insurance: number;
  total: number;
}

// UI types
export interface PropertyListFilters {
  status?: PropertyStatus;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  tags?: string[];
  weBothLike?: boolean;
}

export interface PropertyWithRatings extends Property {
  my_rating?: number;
  partner_rating?: number;
  average_rating?: number;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  JoinHousehold: { inviteCode?: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Home: undefined;
  Map: undefined;
  Showings: undefined;
  Clients: undefined;
  Compare: undefined;
  Calculators: undefined;
  Settings: undefined;
};

export type HomeStackParamList = {
  PropertyList: undefined;
  PropertyDetail: { propertyId: string };
  AddProperty: { propertyId?: string };
};

// Showing/Tour Scheduling
export interface Showing {
  id: string;
  property_id: string;
  client_id?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  feedback?: string;
  rating?: number;
  follow_up_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Client Management (for brokers)
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'closed';
  source?: string; // referral, website, zillow, etc.
  budget_min?: number;
  budget_max?: number;
  preferred_beds?: number;
  preferred_baths?: number;
  preferred_locations?: string[];
  timeline?: string; // 'immediately' | '1-3 months' | '3-6 months' | '6+ months'
  pre_approved?: boolean;
  pre_approval_amount?: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Activity Tracking
export type ActivityType =
  | 'property_added'
  | 'status_changed'
  | 'note_added'
  | 'photo_added'
  | 'showing_scheduled'
  | 'showing_completed'
  | 'offer_made'
  | 'offer_updated'
  | 'document_added'
  | 'price_change'
  | 'rating_added';

export interface Activity {
  id: string;
  property_id: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, any>;
  created_by: string;
  created_at: string;
}

// Price History Tracking
export interface PriceHistory {
  id: string;
  property_id: string;
  price: number;
  date: string;
  change_type: 'initial' | 'increase' | 'decrease';
  change_amount?: number;
  change_percent?: number;
  created_at: string;
}

// Financial Profile for AI-powered analysis
export interface FinancialProfile {
  // Income
  annual_household_income?: number;
  additional_annual_income?: number; // bonuses, rental income, etc.

  // Debts
  monthly_debt_payments?: number; // car loans, student loans, credit cards, etc.

  // Assets
  available_down_payment?: number;
  total_savings?: number; // for reserves/emergency fund analysis

  // Credit
  credit_score_range?: 'excellent' | 'good' | 'fair' | 'poor'; // 750+, 700-749, 650-699, <650

  // Preferences
  target_monthly_payment?: number;
  max_dti_percent?: number; // debt-to-income ratio limit (typically 43%)

  // Investment goals
  investment_horizon_years?: number; // how long they plan to hold
  rental_income_potential?: boolean; // considering house hacking or future rental
  first_time_buyer?: boolean;
}
