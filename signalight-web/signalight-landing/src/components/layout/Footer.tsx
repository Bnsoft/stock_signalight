import { Radio } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-semibold mb-3">
              <Radio className="w-4 h-4 text-signal-green" />
              Signalight
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Personal stock signal scanner for ETF traders.
              Signal + Light — when the signal fires, you see the light.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-sm font-medium mb-3">Product</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features"     className="hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a></li>
              <li><a href="#pricing"      className="hover:text-foreground transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-sm font-medium mb-3">Resources</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://github.com/Bnsoft/stock_signalight"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 space-y-3">
          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            ⚠️ <strong>Disclaimer:</strong> Signalight is for educational and personal use only.
            It does not constitute financial advice. Always do your own research before making investment decisions.
            Past signals do not guarantee future performance.
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Signalight. MIT License.
          </p>
        </div>
      </div>
    </footer>
  )
}
