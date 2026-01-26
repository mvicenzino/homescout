import { Property, HomeBuyerProfile } from '../types';

export interface MatchScoreResult {
  score: number; // 0-100
  label: 'Perfect' | 'Great' | 'Good' | 'Fair' | 'Poor';
  color: string;
  breakdown: {
    budget: number;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    location: number;
  };
  issues: string[];
}

/**
 * Calculate how well a property matches a buyer's preferences
 * Returns a score from 0-100 with breakdown by category
 */
export function calculateMatchScore(
  property: Property,
  profile: HomeBuyerProfile | undefined
): MatchScoreResult | null {
  if (!profile) return null;

  // Check if profile has any preferences set
  const hasPreferences =
    profile.budget_min ||
    profile.budget_max ||
    profile.min_beds ||
    profile.min_baths ||
    profile.min_sqft ||
    profile.preferred_cities?.length;

  if (!hasPreferences) return null;

  const issues: string[] = [];
  let totalWeight = 0;
  let weightedScore = 0;

  // Budget Score (weight: 35)
  let budgetScore = 100;
  if (profile.budget_min || profile.budget_max) {
    const budgetWeight = 35;
    totalWeight += budgetWeight;

    if (profile.budget_max && property.price > profile.budget_max) {
      const overBudget = ((property.price - profile.budget_max) / profile.budget_max) * 100;
      if (overBudget > 20) {
        budgetScore = 0;
        issues.push(`${Math.round(overBudget)}% over budget`);
      } else if (overBudget > 10) {
        budgetScore = 40;
        issues.push(`${Math.round(overBudget)}% over budget`);
      } else {
        budgetScore = 70;
        issues.push('Slightly over budget');
      }
    } else if (profile.budget_min && property.price < profile.budget_min) {
      budgetScore = 80; // Under budget is usually fine
    }
    weightedScore += budgetScore * budgetWeight;
  }

  // Bedrooms Score (weight: 25)
  let bedroomsScore = 100;
  if (profile.min_beds) {
    const bedsWeight = 25;
    totalWeight += bedsWeight;

    if (property.beds < profile.min_beds) {
      const deficit = profile.min_beds - property.beds;
      if (deficit >= 2) {
        bedroomsScore = 20;
        issues.push(`${deficit} fewer bedrooms than needed`);
      } else {
        bedroomsScore = 60;
        issues.push('1 fewer bedroom than preferred');
      }
    } else if (property.beds > profile.min_beds) {
      bedroomsScore = 100; // More bedrooms is good
    }
    weightedScore += bedroomsScore * bedsWeight;
  }

  // Bathrooms Score (weight: 15)
  let bathroomsScore = 100;
  if (profile.min_baths) {
    const bathsWeight = 15;
    totalWeight += bathsWeight;

    if (property.baths < profile.min_baths) {
      const deficit = profile.min_baths - property.baths;
      if (deficit >= 1.5) {
        bathroomsScore = 30;
        issues.push('Fewer bathrooms than needed');
      } else {
        bathroomsScore = 70;
      }
    }
    weightedScore += bathroomsScore * bathsWeight;
  }

  // Square Footage Score (weight: 15)
  let sqftScore = 100;
  if (profile.min_sqft || profile.max_sqft) {
    const sqftWeight = 15;
    totalWeight += sqftWeight;

    if (profile.min_sqft && property.sqft < profile.min_sqft) {
      const deficit = ((profile.min_sqft - property.sqft) / profile.min_sqft) * 100;
      if (deficit > 20) {
        sqftScore = 30;
        issues.push('Much smaller than preferred');
      } else {
        sqftScore = 60;
        issues.push('Smaller than preferred');
      }
    } else if (profile.max_sqft && property.sqft > profile.max_sqft) {
      sqftScore = 80; // Too big is usually okay
    }
    weightedScore += sqftScore * sqftWeight;
  }

  // Location Score (weight: 10)
  let locationScore = 100;
  if (profile.preferred_cities?.length) {
    const locationWeight = 10;
    totalWeight += locationWeight;

    const cityMatch = profile.preferred_cities.some(
      (city) => property.city.toLowerCase().includes(city.toLowerCase()) ||
                city.toLowerCase().includes(property.city.toLowerCase())
    );
    if (!cityMatch) {
      locationScore = 50;
      issues.push('Not in preferred area');
    }
    weightedScore += locationScore * locationWeight;
  }

  // Calculate final score
  const finalScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

  // Determine label and color
  let label: MatchScoreResult['label'];
  let color: string;

  if (finalScore >= 90) {
    label = 'Perfect';
    color = '#10B981'; // green
  } else if (finalScore >= 75) {
    label = 'Great';
    color = '#22C55E'; // light green
  } else if (finalScore >= 60) {
    label = 'Good';
    color = '#F59E0B'; // amber
  } else if (finalScore >= 40) {
    label = 'Fair';
    color = '#F97316'; // orange
  } else {
    label = 'Poor';
    color = '#EF4444'; // red
  }

  return {
    score: finalScore,
    label,
    color,
    breakdown: {
      budget: budgetScore,
      bedrooms: bedroomsScore,
      bathrooms: bathroomsScore,
      sqft: sqftScore,
      location: locationScore,
    },
    issues,
  };
}

/**
 * Calculate days on market from listing date
 */
export function calculateDaysOnMarket(listingDate: string | undefined): number | null {
  if (!listingDate) return null;

  const listed = new Date(listingDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - listed.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get badge info for days on market
 */
export function getDaysOnMarketBadge(days: number | null): {
  label: string;
  color: string;
  bgColor: string;
} | null {
  if (days === null) return null;

  if (days <= 3) {
    return { label: 'Just Listed', color: '#DC2626', bgColor: '#FEE2E2' };
  } else if (days <= 7) {
    return { label: 'New', color: '#EA580C', bgColor: '#FFEDD5' };
  } else if (days <= 14) {
    return { label: `${days}d`, color: '#D97706', bgColor: '#FEF3C7' };
  } else if (days <= 30) {
    return { label: `${days}d`, color: '#65A30D', bgColor: '#ECFCCB' };
  } else if (days <= 60) {
    return { label: `${days}d`, color: '#0891B2', bgColor: '#CFFAFE' };
  } else if (days <= 90) {
    return { label: `${days}d`, color: '#7C3AED', bgColor: '#EDE9FE' };
  } else {
    return { label: `${days}d+`, color: '#6B7280', bgColor: '#F3F4F6' };
  }
}
