import { Header }          from "@/components/layout/Header"
import { Footer }          from "@/components/layout/Footer"
import { Hero }            from "@/components/sections/Hero"
import { Features }        from "@/components/sections/Features"
import { HowItWorks }      from "@/components/sections/HowItWorks"
import { Strategy }        from "@/components/sections/Strategy"
import { TelegramPreview } from "@/components/sections/TelegramPreview"
import { Pricing }         from "@/components/sections/Pricing"
import { CtaBanner }       from "@/components/sections/CtaBanner"

export default function LandingPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Strategy />
        <TelegramPreview />
        <Pricing />
        <CtaBanner />
      </main>
      <Footer />
    </>
  )
}
