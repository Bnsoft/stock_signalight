import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

export function CtaBanner() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="rounded-2xl border border-signal-green/20 bg-signal-green/5 p-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Start monitoring your portfolio today.
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Free forever. No credit card. No account needed.
            <br />
            Just Python + Telegram.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-signal-green hover:bg-signal-green/90 text-black font-semibold px-10">
              Start Free
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              View on GitHub
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
