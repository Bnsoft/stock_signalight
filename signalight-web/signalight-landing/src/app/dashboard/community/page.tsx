"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { MessageCircle, Heart, Share2, Trophy, Users, Zap } from "lucide-react"

interface Post {
  id: number
  user_id: string
  title: string
  content: string
  post_type: string
  symbol?: string
  likes: number
  comments_count: number
  created_at: string
}

interface LeaderboardEntry {
  rank: number
  user_id: string
  avg_return: number
  trade_count: number
}

interface Challenge {
  id: number
  title: string
  description: string
  reward: string
  difficulty: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function CommunityPage() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [userRank, setUserRank] = useState<any>(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    post_type: "DISCUSSION",
    symbol: ""
  })

  useEffect(() => {
    if (!token) return

    const fetchCommunityData = async () => {
      try {
        // Fetch community feed
        const feedRes = await fetch(`${API_BASE}/api/community/feed?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (feedRes.ok) {
          const data = await feedRes.json()
          setPosts(data.posts)
        }

        // Fetch leaderboard
        const leaderboardRes = await fetch(`${API_BASE}/api/leaderboard?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (leaderboardRes.ok) {
          const data = await leaderboardRes.json()
          setLeaderboard(data.leaderboard)
        }

        // Fetch challenges
        const challengesRes = await fetch(`${API_BASE}/api/challenges`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (challengesRes.ok) {
          const data = await challengesRes.json()
          setChallenges(data.challenges)
        }

        if (user?.user_id) {
          // Fetch user rank
          const rankRes = await fetch(`${API_BASE}/api/user/${user.user_id}/leaderboard-rank`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (rankRes.ok) {
            const data = await rankRes.json()
            setUserRank(data)
          }
        }
      } catch (err) {
        console.error("Failed to load community data", err)
      } finally {
        setLoading(false)
      }
    }

    fetchCommunityData()
  }, [token, user?.user_id])

  const handlePostSubmit = async () => {
    if (!newPost.title || !newPost.content) {
      alert("제목과 내용을 입력하세요")
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/community/posts?user_id=${user?.user_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPost),
      })

      if (res.ok) {
        setNewPost({ title: "", content: "", post_type: "DISCUSSION", symbol: "" })
        setShowNewPost(false)
        // Refetch
        const feedRes = await fetch(`${API_BASE}/api/community/feed?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (feedRes.ok) {
          const data = await feedRes.json()
          setPosts(data.posts)
        }
      }
    } catch (err) {
      console.error("Failed to create post", err)
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
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Users className="w-8 h-8 text-blue-500" />
                커뮤니티
              </h1>
              <p className="text-muted-foreground">
                투자자들과 신호 공유, 토론, 경쟁
              </p>
            </div>
            <Button onClick={() => setShowNewPost(true)}>
              <MessageCircle className="w-4 h-4 mr-2" />
              게시물 작성
            </Button>
          </div>
        </AnimateIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2">
            {/* Community Posts */}
            <AnimateIn from="bottom" delay={40}>
              <div className="space-y-4 mb-6">
                {posts.map(post => (
                  <div
                    key={post.id}
                    className="bg-card border border-border rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{post.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {post.user_id} • {new Date(post.created_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      {post.symbol && (
                        <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded">
                          {post.symbol}
                        </span>
                      )}
                    </div>

                    <p className="text-sm mb-4 line-clamp-3">{post.content}</p>

                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm">{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">{post.comments_count}</span>
                      </button>
                      <button className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </AnimateIn>

            {/* Monthly Challenges */}
            <AnimateIn from="bottom" delay={80}>
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  이달의 도전과제
                </h2>
                <div className="space-y-3">
                  {challenges.map(challenge => (
                    <div key={challenge.id} className="p-4 bg-muted/30 rounded border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{challenge.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          challenge.difficulty === "EASY"
                            ? "bg-green-500/20 text-green-600"
                            : challenge.difficulty === "MEDIUM"
                            ? "bg-yellow-500/20 text-yellow-600"
                            : "bg-red-500/20 text-red-600"
                        }`}>
                          {challenge.difficulty === "EASY" ? "쉬움" : challenge.difficulty === "MEDIUM" ? "중간" : "어려움"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {challenge.description}
                      </p>
                      <p className="text-xs font-semibold text-primary">
                        보상: {challenge.reward}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Rank */}
            {userRank && (
              <AnimateIn from="bottom" delay={40}>
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    내 순위
                  </h3>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-500 mb-2">
                      #{userRank.rank}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      평균 수익률: {userRank.avg_return.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      거래 수: {userRank.trade_count}건
                    </p>
                  </div>
                </div>
              </AnimateIn>
            )}

            {/* Top Leaderboard */}
            <AnimateIn from="bottom" delay={80}>
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-bold mb-4">이달의 Top 투자자</h3>
                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold w-6 text-center ${
                          idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-orange-600" : "text-gray-500"
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{entry.user_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.trade_count} 거래
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-green-600">
                        +{entry.avg_return.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>

        {/* New Post Dialog */}
        {showNewPost && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">게시물 작성</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">제목</label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    placeholder="게시물 제목"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">내용</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    placeholder="상세 내용을 입력하세요"
                    rows={4}
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">카테고리</label>
                    <select
                      value={newPost.post_type}
                      onChange={(e) => setNewPost({ ...newPost, post_type: e.target.value })}
                      className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                    >
                      <option value="DISCUSSION">토론</option>
                      <option value="SIGNAL_ANALYSIS">신호 분석</option>
                      <option value="STRATEGY">전략</option>
                      <option value="QUESTION">질문</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">심볼 (선택)</label>
                    <input
                      type="text"
                      value={newPost.symbol}
                      onChange={(e) => setNewPost({ ...newPost, symbol: e.target.value.toUpperCase() })}
                      placeholder="QQQ"
                      className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button onClick={handlePostSubmit} className="flex-1">
                  게시
                </Button>
                <Button onClick={() => setShowNewPost(false)} variant="outline" className="flex-1">
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
