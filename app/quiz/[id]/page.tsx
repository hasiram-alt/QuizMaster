"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Clock, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react"
import { useRouter, useParams } from "next/navigation"

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
}

interface Quiz {
  id: string
  title: string
  description: string
  tags: string[]
  questions: Question[]
  createdAt: string
  attempts: number
}

export default function QuizPage() {
  const [user, setUser] = useState<any>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [key: string]: number }>({})
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const params = useParams()
  const quizId = params.id as string

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
    loadQuiz()

    // Check if user has already attempted this quiz
    const attempts = localStorage.getItem(`attempts_${parsedUser.id}`)
    if (attempts) {
      const userAttempts = JSON.parse(attempts)
      if (userAttempts.some((attempt: any) => attempt.quizId === quizId)) {
        router.push("/dashboard")
        return
      }
    }
  }, [router, quizId])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const loadQuiz = () => {
    const savedQuizzes = localStorage.getItem("quizzes")
    if (savedQuizzes) {
      const quizzes = JSON.parse(savedQuizzes)
      const foundQuiz = quizzes.find((q: Quiz) => q.id === quizId)
      if (foundQuiz) {
        setQuiz(foundQuiz)
      } else {
        router.push("/dashboard")
      }
    }
  }

  const handleAnswerChange = (questionId: string, answerIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }))
  }

  const nextQuestion = () => {
    if (currentQuestion < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  const submitQuiz = async () => {
    if (!quiz || !user) return

    setIsSubmitting(true)

    // Calculate score
    let score = 0
    quiz.questions.forEach((question) => {
      const userAnswer = answers[question.id]
      if (userAnswer === question.correctAnswer) {
        score++
      }
    })

    // Save attempt
    const attempt = {
      quizId: quiz.id,
      score,
      totalQuestions: quiz.questions.length,
      completedAt: new Date().toISOString(),
      timeElapsed,
      answers,
    }

    const existingAttempts = localStorage.getItem(`attempts_${user.id}`)
    const attempts = existingAttempts ? JSON.parse(existingAttempts) : []
    attempts.push(attempt)
    localStorage.setItem(`attempts_${user.id}`, JSON.stringify(attempts))

    // Update quiz attempts count
    const savedQuizzes = localStorage.getItem("quizzes")
    if (savedQuizzes) {
      const quizzes = JSON.parse(savedQuizzes)
      const updatedQuizzes = quizzes.map((q: Quiz) => (q.id === quiz.id ? { ...q, attempts: q.attempts + 1 } : q))
      localStorage.setItem("quizzes", JSON.stringify(updatedQuizzes))
    }

    // Redirect to results
    router.push(`/results/${quiz.id}`)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getAnsweredCount = () => {
    return Object.keys(answers).length
  }

  const isCurrentQuestionAnswered = () => {
    return quiz?.questions[currentQuestion] && answers[quiz.questions[currentQuestion].id] !== undefined
  }

  if (!user || !quiz) return null

  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100
  const currentQ = quiz.questions[currentQuestion]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
                <p className="text-sm text-gray-600">
                  Question {currentQuestion + 1} of {quiz.questions.length}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{formatTime(timeElapsed)}</span>
              </div>
              <div className="text-sm text-gray-600">
                {getAnsweredCount()}/{quiz.questions.length} answered
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">Question {currentQuestion + 1}</CardTitle>
              <CardDescription className="text-lg">{currentQ.question}</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[currentQ.id]?.toString() || ""}
                onValueChange={(value) => handleAnswerChange(currentQ.id, Number.parseInt(value))}
                className="space-y-4"
              >
                {currentQ.options.map((option, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-base">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button onClick={previousQuestion} disabled={currentQuestion === 0} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center space-x-2">
              {quiz.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    index === currentQuestion
                      ? "bg-blue-600 text-white"
                      : answers[quiz.questions[index].id] !== undefined
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-gray-100 text-gray-600 border border-gray-300"
                  }`}
                >
                  {answers[quiz.questions[index].id] !== undefined && index !== currentQuestion && (
                    <CheckCircle className="h-4 w-4 mx-auto" />
                  )}
                  {(answers[quiz.questions[index].id] === undefined || index === currentQuestion) && index + 1}
                </button>
              ))}
            </div>

            {currentQuestion === quiz.questions.length - 1 ? (
              <Button
                onClick={submitQuiz}
                disabled={isSubmitting || getAnsweredCount() < quiz.questions.length}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            ) : (
              <Button
                onClick={nextQuestion}
                disabled={!isCurrentQuestionAnswered()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Progress Summary */}
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">
                  Progress: {getAnsweredCount()}/{quiz.questions.length} questions answered
                </span>
                <span className="text-blue-700">Time elapsed: {formatTime(timeElapsed)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
