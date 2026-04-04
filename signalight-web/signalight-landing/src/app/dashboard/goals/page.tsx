"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Plus, Target } from "lucide-react"

interface Goal {
  id: number
  goal_name: string
  target_amount: number
  progress_percent: number
  days_remaining: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function GoalsPage() {
  const { user, token } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoal, setNewGoal] = useState({ goal_name: "", target_amount: 0, target_date: "" })

  useEffect(() => {
    if (!user?.user_id || !token) return

    const fetchGoals = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/goals/${user.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setGoals(data.goals)
        }
      } catch (err) {
        console.error("Failed to load goals")
      } finally {
        setLoading(false)
      }
    }

    fetchGoals()
  }, [user, token])

  const handleAddGoal = async () => {
    if (!newGoal.goal_name || newGoal.target_amount <= 0 || !newGoal.target_date) {
      alert("모든 필드를 입력하세요")
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/goals?user_id=${user?.user_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newGoal),
      })

      if (res.ok) {
        setNewGoal({ goal_name: "", target_amount: 0, target_date: "" })
        setShowAddGoal(false)
        // Refetch
        const goalsRes = await fetch(`${API_BASE}/api/goals/${user?.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (goalsRes.ok) {
          const data = await goalsRes.json()
          setGoals(data.goals)
        }
      }
    } catch (err: any) {
      alert("목표 추가 실패: " + err.message)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-background p-6 animate-pulse" />
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">투자 목표</h1>
              <p className="text-muted-foreground">장기 투자 목표 추적 및 관리</p>
            </div>
            <Button onClick={() => setShowAddGoal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              목표 추가
            </Button>
          </div>
        </AnimateIn>

        <AnimateIn from="bottom" delay={80}>
          <div className="space-y-4">
            {goals.length > 0 ? (
              goals.map((goal, idx) => (
                <div key={idx} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{goal.goal_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        목표: ${goal.target_amount.toLocaleString()} | 남은 기간: {goal.days_remaining}일
                      </p>
                    </div>
                    <Target className="w-6 h-6 text-primary" />
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">진행도</span>
                      <span className="text-sm font-semibold text-primary">
                        {goal.progress_percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {goal.progress_percent >= 100 && (
                    <div className="text-sm text-green-600 font-semibold">✓ 목표 달성!</div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">아직 목표가 없습니다.</p>
                <p className="text-sm text-muted-foreground mt-2">장기 투자 목표를 설정하세요.</p>
              </div>
            )}
          </div>
        </AnimateIn>

        {/* Add Goal Dialog */}
        {showAddGoal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">목표 추가</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">목표명</label>
                  <input
                    type="text"
                    value={newGoal.goal_name}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, goal_name: e.target.value })
                    }
                    placeholder="자산 100만 달러"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">목표 금액 ($)</label>
                  <input
                    type="number"
                    value={newGoal.target_amount}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, target_amount: Number(e.target.value) })
                    }
                    placeholder="1000000"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">목표 날짜</label>
                  <input
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, target_date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button onClick={handleAddGoal} className="flex-1">
                  추가
                </Button>
                <Button onClick={() => setShowAddGoal(false)} variant="outline" className="flex-1">
                  취소
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
