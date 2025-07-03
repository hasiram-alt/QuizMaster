"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain, Play, CheckCircle, Clock, LogOut, Trophy } from "lucide-react"
import { useRouter } from "next/navigation"

interface Quiz {
  id: string
  title: string
  description: string
  tags: string[]
  questions: any[]
  createdAt: string
  attempts: number
}

interface UserAttempt {
  quizId: string
  score: number
  totalQuestions: number
  completedAt: string
}

export default function UserDashboard() {
  const [user, setUser] = useState<any>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [userAttempts, setUserAttempts] = useState<UserAttempt[]>([])
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("currentUser")
    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== "user") {
      router.push("/admin")
      return
    }

    setUser(parsedUser)
    loadQuizzes()
    loadUserAttempts(parsedUser.id)
  }, [router])

  const loadQuizzes = () => {
    const savedQuizzes = localStorage.getItem("quizzes")
    if (savedQuizzes) {
      setQuizzes(JSON.parse(savedQuizzes))
    }
  }

  const loadUserAttempts = (userId: string) => {
    const attempts = localStorage.getItem(`attempts_${userId}`)
    if (attempts) {
      setUserAttempts(JSON.parse(attempts))
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("currentUser")
    router.push("/")
  }

  const startQuiz = (quizId: string) => {
    router.push(`/quiz/${quizId}`)
  }

  const hasAttempted = (quizId: string) => {
    return userAttempts.some((attempt) => attempt.quizId === quizId)
  }

  const getAttemptScore = (quizId: string) => {
    const attempt = userAttempts.find((a) => a.quizId === quizId)
    return attempt ? attempt.score : 0
  }

  const getAttemptPercentage = (quizId: string) => {
    const attempt = userAttempts.find((a) => a.quizId === quizId)
    return attempt ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 0
  }

  const averageScore =
    userAttempts.length > 0
      ? Math.round(
          userAttempts.reduce((acc, attempt) => acc + (attempt.score / attempt.totalQuestions) * 100, 0) /
            userAttempts.length,
        )
      : 0

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Brain className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quiz Dashboard</h1>
                <p className="text-gray-600">Welcome back, {user.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Quizzes</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizzes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userAttempts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizzes.length - userAttempts.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Attempts */}
        {userAttempts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Results</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userAttempts.slice(-3).map((attempt) => {
                const quiz = quizzes.find((q) => q.id === attempt.quizId)
                if (!quiz) return null

                const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100)

                return (
                  <Card key={attempt.quizId} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      <CardDescription>Completed {new Date(attempt.completedAt).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Score</span>
                          <span className="font-semibold">
                            {attempt.score}/{attempt.totalQuestions}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <div className="text-center text-sm font-medium text-green-600">{percentage}%</div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Available Quizzes */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Available Quizzes</h2>

          {quizzes.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No quizzes available</h3>
                <p className="text-gray-600">Check back later for new quizzes!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => {
                const attempted = hasAttempted(quiz.id)
                const score = getAttemptScore(quiz.id)
                const percentage = getAttemptPercentage(quiz.id)

                return (
                  <Card
                    key={quiz.id}
                    className={`hover:shadow-lg transition-shadow ${
                      attempted ? "border-green-200 bg-green-50/30" : ""
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 flex items-center gap-2">
                            {quiz.title}
                            {attempted && <CheckCircle className="h-5 w-5 text-green-600" />}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {quiz.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{quiz.questions.length} questions</span>
                          <span>{quiz.attempts} total attempts</span>
                        </div>

                        {attempted ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Your Score</span>
                              <span className="font-semibold">
                                {score}/{quiz.questions.length}
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                            <div className="text-center text-sm font-medium text-green-600">
                              {percentage}% - Completed
                            </div>
                            <Button
                              onClick={() => router.push(`/results/${quiz.id}`)}
                              variant="outline"
                              className="w-full"
                            >
                              View Results
                            </Button>
                          </div>
                        ) : (
                          <Button onClick={() => startQuiz(quiz.id)} className="w-full bg-blue-600 hover:bg-blue-700">
                            <Play className="h-4 w-4 mr-2" />
                            Start Quiz
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
