import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/layout/ThemeProvider"
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Signalight — Stock Signal Scanner",
  description:
    "Personal stock signal scanner for ETF traders. RSI, MA crossover, drawdown alerts — straight to your Telegram.",
  keywords: ["stock signals", "ETF scanner", "RSI alert", "trading bot", "QQQ", "TQQQ"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Signalight",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Signalight — Stock Signal Scanner",
    description:
      "Personal stock signal scanner for ETF traders. RSI, MA crossover, drawdown alerts — straight to your Telegram.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signalight — Stock Signal Scanner",
    description: "Personal stock signal scanner for ETF traders.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ServiceWorkerRegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
