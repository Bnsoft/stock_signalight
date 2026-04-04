"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Download, Link, Mail } from "lucide-react"
import type { CalculationResult } from "@/lib/calculator"

interface ShareCalculationDialogProps {
  calculation: CalculationResult
  calculationId?: number
  isOpen: boolean
  onClose: () => void
}

export function ShareCalculationDialog({
  calculation,
  calculationId,
  isOpen,
  onClose,
}: ShareCalculationDialogProps) {
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState("")

  if (!isOpen) return null

  const shareUrl = `${window.location.origin}/dashboard/shared-calculation/${calculationId || "demo"}`
  const calculationSummary = `
Profit Calculator Results
========================
Principal: $${calculation.principal.toLocaleString()}
Period: ${calculation.periodMonths} months (${calculation.periodYears.toFixed(1)} years)
Target ROI: ${calculation.targetROI}%
Interest Type: ${calculation.isCompound ? "Compound" : "Simple"}

RESULTS
-------
Final Value: $${calculation.finalValue.toLocaleString()}
Gross Profit: $${calculation.grossProfit.toLocaleString()}
Tax Amount: $${calculation.taxAmount.toLocaleString()}
Net Profit: $${calculation.netProfit.toLocaleString()}
After-Tax ROI: ${calculation.afterTaxROI.toFixed(2)}%
  `.trim()

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setMessage("Share link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      setMessage("Failed to copy link")
    }
  }

  const handleCopyResults = async () => {
    try {
      await navigator.clipboard.writeText(calculationSummary)
      setMessage("Results copied to clipboard!")
      setTimeout(() => {}, 2000)
    } catch (err) {
      setMessage("Failed to copy results")
    }
  }

  const handleDownloadPDF = () => {
    // Simple PDF-like text download (real PDF generation would use a library like jsPDF)
    const element = document.createElement("a")
    const file = new Blob([calculationSummary], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `calculation-${Date.now()}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    setMessage("Calculation exported!")
    setTimeout(() => {}, 2000)
  }

  const handleEmailShare = () => {
    const subject = `Profit Calculator Results - ${calculation.targetROI}% ROI`
    const body = encodeURIComponent(calculationSummary + `\n\nView online: ${shareUrl}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full p-6 animate-in">
        <h2 className="text-xl font-bold mb-4">Share Calculation</h2>

        {message && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded text-sm text-primary">
            {message}
          </div>
        )}

        <div className="space-y-4 mb-6">
          {/* Share Link */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded font-mono truncate"
              />
              <Button
                onClick={handleCopyLink}
                size="sm"
                variant="outline"
                className="flex-shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Share this link for read-only view
            </p>
          </div>

          {/* Results Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Results Summary
            </label>
            <pre className="text-xs bg-background p-3 rounded border border-border overflow-x-auto max-h-48 overflow-y-auto">
              {calculationSummary}
            </pre>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button onClick={handleCopyResults} variant="outline" size="sm" className="text-xs">
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="text-xs">
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
          <Button onClick={handleEmailShare} variant="outline" size="sm" className="text-xs">
            <Mail className="w-3 h-3 mr-1" />
            Email
          </Button>
          <Button onClick={handleCopyLink} variant="outline" size="sm" className="text-xs">
            <Link className="w-3 h-3 mr-1" />
            Link
          </Button>
        </div>

        {/* Close Button */}
        <Button onClick={onClose} className="w-full">
          Done
        </Button>
      </div>
    </div>
  )
}
