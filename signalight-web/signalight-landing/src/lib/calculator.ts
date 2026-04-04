/**
 * Financial calculation utility for profit calculator
 */

export interface CalculationInput {
  principal: number
  periodMonths: number
  targetROI: number
  isCompound: boolean
  taxRate: number
}

export interface CalculationResult {
  principal: number
  periodMonths: number
  periodYears: number
  targetROI: number
  isCompound: boolean
  taxRate: number
  finalValue: number
  grossProfit: number
  taxAmount: number
  netProfit: number
  afterTaxROI: number
  monthlyGrowth: Array<{ month: number; value: number; afterTax: number }>
}

export interface TaxBracket {
  name: string
  shortTerm: number // capital gains tax
  longTerm: number  // capital gains tax
}

// US Federal Tax Brackets (2024)
export const TAX_BRACKETS: Record<string, TaxBracket> = {
  none: { name: "No Tax", shortTerm: 0, longTerm: 0 },
  us_single: { name: "US Single", shortTerm: 0.24, longTerm: 0.15 },
  us_married: { name: "US Married", shortTerm: 0.32, longTerm: 0.15 },
  us_capital_gains_long: { name: "US Capital Gains (Long-term)", shortTerm: 0.24, longTerm: 0.2 },
  us_capital_gains_short: { name: "US Capital Gains (Short-term)", shortTerm: 0.37, longTerm: 0.37 },
  canada: { name: "Canada 50% Inclusion", shortTerm: 0.27, longTerm: 0.27 },
  uk: { name: "UK", shortTerm: 0.20, longTerm: 0.20 },
  singapore: { name: "Singapore", shortTerm: 0, longTerm: 0 },
  australia: { name: "Australia", shortTerm: 0.45, longTerm: 0.225 },
}

/**
 * Calculate compound or simple interest
 */
export function calculateProfit(input: CalculationInput): CalculationResult {
  const principal = Math.max(0, input.principal)
  const periodMonths = Math.max(1, input.periodMonths)
  const periodYears = periodMonths / 12
  const roiPercent = Math.max(0, input.targetROI)
  const roiDecimal = roiPercent / 100

  // Calculate final value based on compound or simple interest
  let finalValue: number
  if (input.isCompound) {
    finalValue = principal * Math.pow(1 + roiDecimal, periodYears)
  } else {
    finalValue = principal * (1 + roiDecimal * periodYears)
  }

  const grossProfit = finalValue - principal

  // Calculate taxes
  const taxAmount = grossProfit * (input.taxRate / 100)
  const netProfit = grossProfit - taxAmount
  const afterTaxROI = (netProfit / principal) * 100 || 0

  // Generate monthly growth data
  const monthlyGrowth: Array<{ month: number; value: number; afterTax: number }> = []
  for (let m = 0; m <= periodMonths; m++) {
    const yearsElapsed = m / 12
    let value: number
    if (input.isCompound) {
      value = principal * Math.pow(1 + roiDecimal, yearsElapsed)
    } else {
      value = principal * (1 + roiDecimal * yearsElapsed)
    }

    const profit = value - principal
    const tax = profit * (input.taxRate / 100)
    const afterTax = value - tax

    monthlyGrowth.push({
      month: m,
      value: Math.round(value * 100) / 100,
      afterTax: Math.round(afterTax * 100) / 100,
    })
  }

  return {
    principal,
    periodMonths,
    periodYears,
    targetROI: roiPercent,
    isCompound: input.isCompound,
    taxRate: input.taxRate,
    finalValue: Math.round(finalValue * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    afterTaxROI: Math.round(afterTaxROI * 100) / 100,
    monthlyGrowth,
  }
}

/**
 * Generate scenarios for comparison
 */
export function generateScenarios(
  principal: number,
  periodMonths: number,
  taxRate: number,
  isCompound: boolean
): Array<{ roi: number; finalValue: number; netProfit: number; afterTaxROI: number }> {
  const rois = [5, 10, 15, 20, 25, 30]
  return rois.map((roi) => {
    const result = calculateProfit({
      principal,
      periodMonths,
      targetROI: roi,
      isCompound,
      taxRate,
    })
    return {
      roi,
      finalValue: result.finalValue,
      netProfit: result.netProfit,
      afterTaxROI: result.afterTaxROI,
    }
  })
}

/**
 * Calculate break-even ROI based on time and investment
 */
export function calculateBreakeven(
  principal: number,
  periodMonths: number,
  targetAmount: number,
  isCompound: boolean
): number {
  const periodYears = periodMonths / 12

  if (targetAmount <= principal) {
    return 0
  }

  if (!isCompound) {
    // Simple interest: Target = Principal * (1 + ROI * Years)
    const roi = ((targetAmount / principal - 1) / periodYears) * 100
    return Math.max(0, roi)
  }

  // Compound interest: Target = Principal * (1 + ROI)^Years
  // ROI = (Target / Principal)^(1/Years) - 1
  const roiDecimal = Math.pow(targetAmount / principal, 1 / periodYears) - 1
  return Math.max(0, roiDecimal * 100)
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`
}
