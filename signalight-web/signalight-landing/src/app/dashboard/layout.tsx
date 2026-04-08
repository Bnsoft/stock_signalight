import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { DashboardNav } from "@/components/dashboard/DashboardNav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex">
        <DashboardNav />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
