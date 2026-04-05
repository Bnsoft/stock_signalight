"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { BookOpen, Play, Check, TrendingUp, Award, Zap } from "lucide-react"

interface Course {
  id: number
  title: string
  category: string
  level: string
  description: string
  duration_minutes: number
  instructor: string
  thumbnail_url?: string
}

interface UserCourse {
  id: number
  title: string
  category: string
  level: string
  status: string
  progress_percent: number
  enrollment_date: string
}

interface CaseStudy {
  id: number
  title: string
  category: string
  outcome: string
  stock_symbol: string
  entry_price: number
  exit_price: number
  return_percent: number
  lessons_learned: string
}

interface LearningProgress {
  total_courses_enrolled: number
  courses_completed: number
  average_progress: number
  completion_rate: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const COURSE_CATEGORIES = [
  { value: "", label: "모든 카테고리" },
  { value: "BASICS", label: "기초" },
  { value: "INDICATORS", label: "지표" },
  { value: "STRATEGIES", label: "전략" },
  { value: "RISK_MANAGEMENT", label: "리스크 관리" }
]

const COURSE_LEVELS = [
  { value: "", label: "모든 수준" },
  { value: "BEGINNER", label: "초급" },
  { value: "INTERMEDIATE", label: "중급" },
  { value: "ADVANCED", label: "고급" }
]

export default function EducationPage() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [userCourses, setUserCourses] = useState<UserCourse[]>([])
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([])
  const [progress, setProgress] = useState<LearningProgress | null>(null)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("")
  const [activeTab, setActiveTab] = useState<"explore" | "my-courses" | "case-studies">("explore")

  useEffect(() => {
    if (!token) return

    const fetchEducationData = async () => {
      try {
        // Fetch available courses
        const coursesRes = await fetch(
          `${API_BASE}/api/courses?category=${selectedCategory}&level=${selectedLevel}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (coursesRes.ok) {
          const data = await coursesRes.json()
          setCourses(data.courses)
        }

        if (user?.user_id) {
          // Fetch user's enrolled courses
          const userCoursesRes = await fetch(`${API_BASE}/api/user/${user.user_id}/courses`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (userCoursesRes.ok) {
            const data = await userCoursesRes.json()
            setUserCourses(data.courses)
          }

          // Fetch learning progress
          const progressRes = await fetch(`${API_BASE}/api/user/${user.user_id}/learning-progress`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (progressRes.ok) {
            const data = await progressRes.json()
            setProgress(data)
          }
        }

        // Fetch case studies
        const studiesRes = await fetch(`${API_BASE}/api/case-studies`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (studiesRes.ok) {
          const data = await studiesRes.json()
          setCaseStudies(data.case_studies)
        }
      } catch (err) {
        console.error("Failed to load education data", err)
      } finally {
        setLoading(false)
      }
    }

    fetchEducationData()
  }, [token, selectedCategory, selectedLevel, user?.user_id])

  const handleEnroll = async (courseId: number) => {
    if (!user?.user_id || !token) return

    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/enroll?user_id=${user.user_id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        // Refetch user courses
        const userCoursesRes = await fetch(`${API_BASE}/api/user/${user.user_id}/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (userCoursesRes.ok) {
          const data = await userCoursesRes.json()
          setUserCourses(data.courses)
        }
      }
    } catch (err) {
      console.error("Failed to enroll", err)
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "BEGINNER":
        return "bg-green-500/10 text-green-600"
      case "INTERMEDIATE":
        return "bg-yellow-500/10 text-yellow-600"
      case "ADVANCED":
        return "bg-red-500/10 text-red-600"
      default:
        return "bg-gray-500/10 text-gray-600"
    }
  }

  const getCategoryLabel = (category: string) => {
    const cat = COURSE_CATEGORIES.find(c => c.value === category)
    return cat?.label || category
  }

  if (loading) {
    return <div className="min-h-screen bg-background p-6 animate-pulse" />
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-500" />
              교육 & 학습
            </h1>
            <p className="text-muted-foreground">
              트레이딩 신호 해석 가이드, 전략 강의, 사례 분석
            </p>
          </div>
        </AnimateIn>

        {/* Learning Progress Overview */}
        {progress && (
          <AnimateIn from="bottom" delay={40}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">등록한 강의</p>
                <p className="text-3xl font-bold">{progress.total_courses_enrolled}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">완료한 강의</p>
                <p className="text-3xl font-bold text-green-600">{progress.courses_completed}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">평균 진행도</p>
                <p className="text-3xl font-bold text-blue-600">
                  {progress.average_progress.toFixed(0)}%
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">완료율</p>
                <p className="text-3xl font-bold text-purple-600">
                  {progress.completion_rate.toFixed(0)}%
                </p>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Tab Navigation */}
        <AnimateIn from="bottom" delay={80}>
          <div className="flex gap-2 mb-6 border-b border-border">
            <button
              onClick={() => setActiveTab("explore")}
              className={`px-4 py-2 font-medium border-b-2 transition-all ${
                activeTab === "explore"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Play className="w-4 h-4 inline mr-2" />
              강의 탐색
            </button>
            <button
              onClick={() => setActiveTab("my-courses")}
              className={`px-4 py-2 font-medium border-b-2 transition-all ${
                activeTab === "my-courses"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Check className="w-4 h-4 inline mr-2" />
              내 강의 ({userCourses.length})
            </button>
            <button
              onClick={() => setActiveTab("case-studies")}
              className={`px-4 py-2 font-medium border-b-2 transition-all ${
                activeTab === "case-studies"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              사례분석
            </button>
          </div>
        </AnimateIn>

        {/* Explore Courses */}
        {activeTab === "explore" && (
          <AnimateIn from="bottom" delay={120}>
            <div className="mb-6 flex gap-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded-lg"
              >
                {COURSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded-lg"
              >
                {COURSE_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(course => (
                <div
                  key={course.id}
                  className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary transition-all"
                >
                  {course.thumbnail_url && (
                    <div className="w-full h-40 bg-muted/50 flex items-center justify-center">
                      <Play className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-sm line-clamp-2">{course.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${getLevelColor(course.level)}`}>
                        {course.level === "BEGINNER" ? "초급" : course.level === "INTERMEDIATE" ? "중급" : "고급"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-muted-foreground">
                        {course.duration_minutes}분 • {course.instructor}
                      </span>
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {getCategoryLabel(course.category)}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleEnroll(course.id)}
                      className="w-full"
                      size="sm"
                      disabled={userCourses.some(c => c.id === course.id)}
                    >
                      {userCourses.some(c => c.id === course.id) ? "등록됨" : "등록하기"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </AnimateIn>
        )}

        {/* My Courses */}
        {activeTab === "my-courses" && (
          <AnimateIn from="bottom" delay={120}>
            <div className="space-y-4">
              {userCourses.length > 0 ? (
                userCourses.map(course => (
                  <div key={course.id} className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{course.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {getCategoryLabel(course.category)} • {course.level === "BEGINNER" ? "초급" : course.level === "INTERMEDIATE" ? "중급" : "고급"}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        course.status === "COMPLETED"
                          ? "bg-green-500/20 text-green-600"
                          : "bg-yellow-500/20 text-yellow-600"
                      }`}>
                        {course.status === "COMPLETED" ? "완료" : "진행중"}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">진행도</span>
                        <span className="text-sm font-semibold text-primary">
                          {course.progress_percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(course.progress_percent, 100)}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      등록: {new Date(course.enrollment_date).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">등록한 강의가 없습니다.</p>
                  <Button
                    onClick={() => setActiveTab("explore")}
                    variant="outline"
                    className="mt-4"
                  >
                    강의 탐색하기
                  </Button>
                </div>
              )}
            </div>
          </AnimateIn>
        )}

        {/* Case Studies */}
        {activeTab === "case-studies" && (
          <AnimateIn from="bottom" delay={120}>
            <div className="space-y-4">
              {caseStudies.map(study => (
                <div key={study.id} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{study.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {study.stock_symbol} • {study.category}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs rounded font-semibold ${
                        study.outcome === "SUCCESS"
                          ? "bg-green-500/20 text-green-600"
                          : "bg-red-500/20 text-red-600"
                      }`}
                    >
                      {study.outcome === "SUCCESS" ? "성공" : "실패"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-muted/30 rounded">
                    <div>
                      <p className="text-xs text-muted-foreground">진입가</p>
                      <p className="font-bold">${study.entry_price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">진출가</p>
                      <p className="font-bold">${study.exit_price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">수익률</p>
                      <p className={`font-bold ${study.return_percent > 0 ? "text-green-600" : "text-red-600"}`}>
                        {study.return_percent.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-2">교훈</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {study.lessons_learned}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AnimateIn>
        )}
      </div>
    </div>
  )
}
