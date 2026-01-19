// Currency formatting
export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format currency with cents (for monthly payments)
export function formatCurrencyWithCents(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Number formatting
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

// Square feet formatting
export function formatSqft(sqft: number): string {
  return `${formatNumber(sqft)} sqft`;
}

// Beds/baths formatting
export function formatBedsBaths(beds: number, baths: number): string {
  const bathsStr = baths % 1 === 0 ? baths.toString() : baths.toFixed(1);
  return `${beds} bed, ${bathsStr} bath`;
}

// Price per sqft
export function formatPricePerSqft(price: number, sqft: number): string {
  if (!sqft) return 'N/A';
  const ppsf = price / sqft;
  return `$${Math.round(ppsf)}/sqft`;
}

// Date formatting
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Relative time (e.g., "5 days ago")
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// Days on market
export function formatDaysOnMarket(listingDate?: string): string {
  if (!listingDate) return 'Unknown';
  const date = new Date(listingDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return `${diffDays} days`;
}

// Percentage formatting
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Address formatting
export function formatAddress(
  address: string,
  city: string,
  state: string,
  zip: string
): string {
  return `${address}, ${city}, ${state} ${zip}`;
}

// Short address (just street)
export function formatShortAddress(address: string): string {
  // Remove unit/apt numbers for display
  return address.replace(/\s*(apt|unit|#)\s*\w+$/i, '').trim();
}

// Property status label
export function formatPropertyStatus(status: string): string {
  const labels: Record<string, string> = {
    interested: 'Interested',
    toured: 'Toured',
    offer_made: 'Offer Made',
    under_contract: 'Under Contract',
    rejected: 'Rejected',
    purchased: 'Purchased',
  };
  return labels[status] || status;
}
