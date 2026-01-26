import { Client } from '../types';

export interface LeadScore {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  color: string;
  bgColor: string;
  factors: {
    preApproval: number;
    budget: number;
    timeline: number;
    engagement: number;
    activity: number;
  };
  recommendations: string[];
}

/**
 * Calculate lead score for a client based on various factors
 * Higher scores indicate leads more likely to convert
 */
export function calculateLeadScore(client: Client): LeadScore {
  const factors = {
    preApproval: 0,
    budget: 0,
    timeline: 0,
    engagement: 0,
    activity: 0,
  };
  const recommendations: string[] = [];

  // Pre-Approval Factor (25 points max)
  // Pre-approved clients are much more likely to close
  if (client.pre_approved) {
    factors.preApproval = 25;
    if (client.pre_approval_amount && client.pre_approval_amount >= 500000) {
      factors.preApproval = 25; // High value pre-approval
    }
  } else {
    factors.preApproval = 5;
    recommendations.push('Encourage client to get pre-approved');
  }

  // Budget Factor (20 points max)
  // Clients with clear budget ranges are more serious
  if (client.budget_min && client.budget_max) {
    const budgetRange = client.budget_max - client.budget_min;
    const avgBudget = (client.budget_min + client.budget_max) / 2;

    // Narrower range = more decisive
    if (budgetRange <= avgBudget * 0.3) {
      factors.budget = 20; // Very focused budget
    } else if (budgetRange <= avgBudget * 0.5) {
      factors.budget = 15;
    } else {
      factors.budget = 10;
      recommendations.push('Help client narrow down budget range');
    }
  } else if (client.budget_max) {
    factors.budget = 12;
  } else {
    factors.budget = 3;
    recommendations.push('Discuss budget expectations with client');
  }

  // Timeline Factor (25 points max)
  // Urgent timelines indicate higher conversion probability
  switch (client.timeline) {
    case 'asap':
      factors.timeline = 25;
      break;
    case '1-3_months':
      factors.timeline = 20;
      break;
    case '3-6_months':
      factors.timeline = 12;
      break;
    case '6-12_months':
      factors.timeline = 8;
      recommendations.push('Keep client engaged with market updates');
      break;
    default:
      factors.timeline = 3;
      recommendations.push('Clarify purchase timeline with client');
  }

  // Engagement Factor (15 points max)
  // Based on linked properties and their statuses
  const linkedProperties = client.linked_properties || [];
  if (linkedProperties.length >= 5) {
    factors.engagement = 15;
  } else if (linkedProperties.length >= 3) {
    factors.engagement = 12;
  } else if (linkedProperties.length >= 1) {
    factors.engagement = 8;
  } else {
    factors.engagement = 2;
    recommendations.push('Share more property matches with client');
  }

  // Check for properties with advanced status
  const hasOfferProperty = linkedProperties.some(
    (lp) => lp.status === 'offer_made' || lp.status === 'closed'
  );
  if (hasOfferProperty) {
    factors.engagement = 15; // Max engagement if actively making offers
  }

  // Activity Factor (15 points max)
  // Based on status and recency
  if (client.status === 'active') {
    factors.activity = 12;

    // Bonus for clear preferences
    if (client.preferred_beds && client.preferred_baths) {
      factors.activity = 15;
    }
  } else if (client.status === 'inactive') {
    factors.activity = 3;
    recommendations.push('Re-engage with follow-up call');
  } else if (client.status === 'closed') {
    factors.activity = 0; // Already closed, not an active lead
  }

  // Calculate total score
  const totalScore =
    factors.preApproval +
    factors.budget +
    factors.timeline +
    factors.engagement +
    factors.activity;

  // Determine grade and styling
  let grade: LeadScore['grade'];
  let label: string;
  let color: string;
  let bgColor: string;

  if (totalScore >= 85) {
    grade = 'A';
    label = 'Hot Lead';
    color = '#DC2626';
    bgColor = '#FEE2E2';
  } else if (totalScore >= 70) {
    grade = 'B';
    label = 'Warm Lead';
    color = '#EA580C';
    bgColor = '#FFEDD5';
  } else if (totalScore >= 55) {
    grade = 'C';
    label = 'Active';
    color = '#D97706';
    bgColor = '#FEF3C7';
  } else if (totalScore >= 40) {
    grade = 'D';
    label = 'Nurture';
    color = '#0891B2';
    bgColor = '#CFFAFE';
  } else {
    grade = 'F';
    label = 'Cold';
    color = '#6B7280';
    bgColor = '#F3F4F6';
  }

  return {
    score: totalScore,
    grade,
    label,
    color,
    bgColor,
    factors,
    recommendations: recommendations.slice(0, 3), // Top 3 recommendations
  };
}

/**
 * Sort clients by lead score (highest first)
 */
export function sortClientsByLeadScore(clients: Client[]): Client[] {
  return [...clients].sort((a, b) => {
    const scoreA = calculateLeadScore(a).score;
    const scoreB = calculateLeadScore(b).score;
    return scoreB - scoreA;
  });
}

/**
 * Get lead score distribution for analytics
 */
export function getLeadScoreDistribution(clients: Client[]): {
  hot: number;
  warm: number;
  active: number;
  nurture: number;
  cold: number;
} {
  const distribution = { hot: 0, warm: 0, active: 0, nurture: 0, cold: 0 };

  clients.forEach((client) => {
    const { grade } = calculateLeadScore(client);
    switch (grade) {
      case 'A':
        distribution.hot++;
        break;
      case 'B':
        distribution.warm++;
        break;
      case 'C':
        distribution.active++;
        break;
      case 'D':
        distribution.nurture++;
        break;
      case 'F':
        distribution.cold++;
        break;
    }
  });

  return distribution;
}
