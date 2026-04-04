"use client"

import { useParams } from "next/navigation"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Copy } from "lucide-react"
import Link from "next/link"

// Mock shared calculation data - in production would fetch from API
const mockCalculation = {
  principal: 10000,
  periodMonths: 12,
  periodYears: 1,
  targetROI: 15,
  isCompound: true,
  taxRate: 15,
  finalValue: 11500,
  grossProfit: 1500,
  taxAmount: 225,
  netProfit: 1275,
  afterTaxROI: 12.75,
}

export default function SharedCalculationPage() {
  const params = useParams()
  const id = params.id

  const handleCopy = () => {
    const text = `Profit Calculator Results
Principal: $${mockCalculation.principal.toLocaleString()}
Period: ${mockCalculation.periodMonths} months
Target ROI: ${mockCalculation.targetROI}%
Final Value: $${mockCalculation.finalValue.toLocaleString()}
Net Profit: $${mockCalculation.netProfit.toLocaleString()}
After-Tax ROI: ${mockCalculation.afterTaxROI.toFixed(2)}%`

    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <AnimateIn from="bottom">
          <Link href="/dashboard" className="inline-flex items-center gap-2 mb-6 text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Calculation Result</h1>
            <p className="text-muted-foreground">Read-only shared calculation</p>
          </div>
        </AnimateIn>

        {/* Results Card */}
        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-8 space-y-6">
            {/* Header */}
            <div className="text-center pb-6 border-b border-border">
              <h2 className="text-2xl font-bold mb-2">Profit Projection Results</h2>
              <p className="text-muted-foreground">
                {mockCalculation.periodMonths}-Month Investment with {mockCalculation.targetROI}%
                ROI
              </p>
            </div>

            {/* Input Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Principal</p>
                <p className="font-semibold">${mockCalculation.principal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Period</p>
                <p className="font-semibold">{mockCalculation.periodMonths} months</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Target ROI</p>
                <p className="font-semibold">{mockCalculation.targetROI}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Interest Type</p>
                <p className="font-semibold">
                  {mockCalculation.isCompound ? "Compound" : "Simple"}
                </p>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <span className="font-semibold">Final Value</span>
                <span className="text-2xl font-bold text-green-600">
                  ${mockCalculation.finalValue.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <span className="font-semibold">Net Profit (After Tax)</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${mockCalculation.netProfit.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <span className="font-semibold">Tax Amount</span>
                <span className="text-2xl font-bold text-orange-600">
                  ${mockCalculation.taxAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <span className="font-semibold">After-Tax ROI</span>
                <span className="text-2xl font-bold text-primary">
                  {mockCalculation.afterTaxROI.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 text-sm border-t border-border pt-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Principal (Starting Amount)</span>
                <span className="font-mono">${mockCalculation.principal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Profit ({mockCalculation.targetROI}%)</span>
                <span className="font-mono text-green-600">
                  +${mockCalculation.grossProfit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capital Gains Tax (15%)</span>
                <span className="font-mono text-orange-600">
                  -${mockCalculation.taxAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-bold">
                <span>Final Amount</span>
                <span className="font-mono text-lg">
                  ${mockCalculation.finalValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* Actions */}
        <AnimateIn from="bottom" delay={160}>
          <div className="mt-6 space-y-3">
            <Button onClick={handleCopy} variant="outline" className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Copy Results
            </Button>
            <Link href="/dashboard/calculator" className="block">
              <Button className="w-full">Create Your Own Calculation</Button>
            </Link>
          </div>
        </AnimateIn>

        {/* Disclaimer */}
        <AnimateIn from="bottom" delay={240}>
          <div className="mt-8 p-4 bg-muted/50 border border-border/50 rounded-lg text-xs text-muted-foreground">
            <p>
              <strong>Disclaimer:</strong> This calculation is for informational purposes only
              and should not be considered investment advice. Past performance does not guarantee
              future results. Please consult with a financial advisor before making investment
              decisions.
            </p>
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}
