import { MortgageCalculation, TotalMonthlyCost, ClosingCostEstimate } from '../types';

/**
 * Calculate monthly mortgage payment (Principal & Interest)
 *
 * Formula: M = P [ r(1+r)^n ] / [ (1+r)^n - 1 ]
 * Where:
 *   P = Principal (loan amount)
 *   r = Monthly interest rate (annual rate / 12)
 *   n = Number of payments (years × 12)
 */
export function calculateMonthlyPayment(
  principal: number,
  annualInterestRate: number,
  loanTermYears: number
): number {
  if (principal <= 0) return 0;
  if (annualInterestRate <= 0) return principal / (loanTermYears * 12);

  const monthlyRate = annualInterestRate / 100 / 12;
  const numberOfPayments = loanTermYears * 12;

  const numerator = monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments);
  const denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;

  return principal * (numerator / denominator);
}

/**
 * Calculate full mortgage details
 */
export function calculateMortgage(
  purchasePrice: number,
  downPayment: number,
  annualInterestRate: number,
  loanTermYears: number
): MortgageCalculation {
  const principal = purchasePrice - downPayment;
  const monthlyPayment = calculateMonthlyPayment(principal, annualInterestRate, loanTermYears);
  const totalPayment = monthlyPayment * loanTermYears * 12;
  const totalInterest = totalPayment - principal;

  return {
    principal,
    monthlyPayment,
    totalInterest,
    totalPayment,
  };
}

/**
 * Calculate total monthly housing cost (PITI + HOA + PMI)
 */
export function calculateTotalMonthlyCost(params: {
  purchasePrice: number;
  downPayment: number;
  annualInterestRate: number;
  loanTermYears: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  includePmi?: boolean;
}): TotalMonthlyCost {
  const {
    purchasePrice,
    downPayment,
    annualInterestRate,
    loanTermYears,
    propertyTaxAnnual,
    insuranceAnnual,
    hoaMonthly,
    includePmi = true,
  } = params;

  const principal = purchasePrice - downPayment;
  const downPaymentPercent = (downPayment / purchasePrice) * 100;
  const monthlyPI = calculateMonthlyPayment(principal, annualInterestRate, loanTermYears);

  // PMI typically required if down payment < 20%
  // Estimated at 0.5-1% of loan amount annually
  let monthlyPmi = 0;
  if (includePmi && downPaymentPercent < 20) {
    monthlyPmi = (principal * 0.007) / 12; // 0.7% annual PMI rate
  }

  const monthlyPropertyTax = propertyTaxAnnual / 12;
  const monthlyInsurance = insuranceAnnual / 12;

  return {
    principal_interest: monthlyPI,
    property_tax: monthlyPropertyTax,
    insurance: monthlyInsurance,
    hoa: hoaMonthly,
    pmi: monthlyPmi,
    total: monthlyPI + monthlyPropertyTax + monthlyInsurance + hoaMonthly + monthlyPmi,
  };
}

/**
 * Calculate maximum affordable home price based on DTI
 *
 * DTI = (Monthly Debts + Housing Payment) / Gross Monthly Income
 */
export function calculateMaxAffordablePrice(params: {
  grossMonthlyIncome: number;
  monthlyDebts: number;
  targetDti: number; // as percentage, e.g., 36
  downPaymentAvailable: number;
  annualInterestRate: number;
  loanTermYears: number;
  estimatedTaxRate?: number; // as percentage of home value
  estimatedInsuranceRate?: number; // as percentage of home value
}): number {
  const {
    grossMonthlyIncome,
    monthlyDebts,
    targetDti,
    downPaymentAvailable,
    annualInterestRate,
    loanTermYears,
    estimatedTaxRate = 1.2, // Default 1.2% property tax
    estimatedInsuranceRate = 0.35, // Default 0.35% insurance
  } = params;

  // Maximum total housing payment based on DTI
  const maxTotalHousing = (grossMonthlyIncome * targetDti) / 100 - monthlyDebts;

  if (maxTotalHousing <= 0) return 0;

  // Estimate non-P&I costs as percentage of home value
  // Monthly: (taxRate + insuranceRate) / 100 / 12 * homeValue
  const monthlyRateForTaxAndInsurance = (estimatedTaxRate + estimatedInsuranceRate) / 100 / 12;

  // We need to solve for home price where:
  // P&I + (price * monthlyRateForTaxAndInsurance) = maxTotalHousing
  //
  // This requires iterative solving, so we'll use binary search
  let low = 0;
  let high = 5000000;
  let iterations = 0;
  const maxIterations = 50;

  while (high - low > 1000 && iterations < maxIterations) {
    const mid = (low + high) / 2;
    const principal = mid - downPaymentAvailable;
    const pi = calculateMonthlyPayment(Math.max(0, principal), annualInterestRate, loanTermYears);
    const taxAndInsurance = mid * monthlyRateForTaxAndInsurance;
    const totalHousing = pi + taxAndInsurance;

    if (totalHousing <= maxTotalHousing) {
      low = mid;
    } else {
      high = mid;
    }
    iterations++;
  }

  return Math.floor(low);
}

/**
 * Estimate closing costs
 * Typically 2-5% of purchase price
 */
export function estimateClosingCosts(
  purchasePrice: number,
  loanAmount?: number
): ClosingCostEstimate {
  const loan = loanAmount ?? purchasePrice * 0.8; // Assume 20% down if not specified

  const loanOrigination = loan * 0.01; // 1% of loan
  const appraisal = 500;
  const titleInsurance = purchasePrice * 0.005; // 0.5% of purchase price
  const escrowFees = 1500;
  const recordingFees = 200;
  const prepaidTaxes = (purchasePrice * 0.012) / 12 * 3; // 3 months property tax
  const prepaidInsurance = (purchasePrice * 0.0035) / 12 * 14; // 14 months insurance

  return {
    loan_origination: Math.round(loanOrigination),
    appraisal: Math.round(appraisal),
    title_insurance: Math.round(titleInsurance),
    escrow_fees: Math.round(escrowFees),
    recording_fees: Math.round(recordingFees),
    prepaid_taxes: Math.round(prepaidTaxes),
    prepaid_insurance: Math.round(prepaidInsurance),
    total: Math.round(
      loanOrigination +
      appraisal +
      titleInsurance +
      escrowFees +
      recordingFees +
      prepaidTaxes +
      prepaidInsurance
    ),
  };
}

/**
 * Calculate price per square foot
 */
export function calculatePricePerSqft(price: number, sqft: number): number {
  if (!sqft || sqft === 0) return 0;
  return price / sqft;
}

/**
 * Calculate DTI ratio
 */
export function calculateDti(
  monthlyHousing: number,
  monthlyDebts: number,
  grossMonthlyIncome: number
): number {
  if (grossMonthlyIncome === 0) return 0;
  return ((monthlyHousing + monthlyDebts) / grossMonthlyIncome) * 100;
}

/**
 * Generate amortization schedule
 */
export function generateAmortizationSchedule(
  principal: number,
  annualInterestRate: number,
  loanTermYears: number
): Array<{
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}> {
  const monthlyPayment = calculateMonthlyPayment(principal, annualInterestRate, loanTermYears);
  const monthlyRate = annualInterestRate / 100 / 12;
  const numberOfPayments = loanTermYears * 12;

  let balance = principal;
  const schedule = [];

  for (let month = 1; month <= numberOfPayments; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;

    schedule.push({
      month,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, balance),
    });
  }

  return schedule;
}
