"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trophy, Clock, CheckCircle, XCircle, ArrowLeft, MessageCircle, Send } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"

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
}

interface UserAttempt {
  quizId: string
  score: number
  totalQuestions: number
  completedAt: string
  timeElapsed: number
  answers: { [key: string]: number }
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export default function ResultsPage() {
  const [user, setUser] = useState<any>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [attempt, setAttempt] = useState<UserAttempt | null>(null)
  const [showChatbot, setShowChatbot] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
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
    setUser(parsedUser)
    loadQuizAndAttempt(parsedUser.id)
  }, [router, quizId])

  const loadQuizAndAttempt = (userId: string) => {
    // Load quiz
    const savedQuizzes = localStorage.getItem("quizzes")
    if (savedQuizzes) {
      const quizzes = JSON.parse(savedQuizzes)
      const foundQuiz = quizzes.find((q: Quiz) => q.id === quizId)
      if (foundQuiz) {
        setQuiz(foundQuiz)
      }
    }

    // Load user attempt
    const attempts = localStorage.getItem(`attempts_${userId}`)
    if (attempts) {
      const userAttempts = JSON.parse(attempts)
      const foundAttempt = userAttempts.find((a: UserAttempt) => a.quizId === quizId)
      if (foundAttempt) {
        setAttempt(foundAttempt)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadgeColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-100 text-green-800"
    if (percentage >= 60) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !quiz || !attempt || isStreaming) return

    const userMessage = chatInput.trim()
    setChatInput("")
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsStreaming(true)

    try {
      // Prepare context about the quiz and user's performance
      const quizContext = `
Quiz Title: ${quiz.title}
Quiz Description: ${quiz.description}
Total Questions: ${quiz.questions.length}
User Score: ${attempt.score}/${attempt.totalQuestions}

Questions and User's Answers:
${quiz.questions
  .map((q, index) => {
    const userAnswer = attempt.answers[q.id]
    const isCorrect = userAnswer === q.correctAnswer
    return `
Question ${index + 1}: ${q.question}
Options: ${q.options.map((opt, i) => `${i + 1}. ${opt}`).join(", ")}
Correct Answer: ${q.options[q.correctAnswer]}
User's Answer: ${userAnswer !== undefined ? q.options[userAnswer] : "Not answered"}
Result: ${isCorrect ? "Correct" : "Incorrect"}
`
  })
  .join("\n")}
`

      const systemPrompt = `You are a helpful AI tutor providing feedback on a quiz. Use the quiz context to answer the user's questions about their performance, explain concepts, and provide educational guidance. Be encouraging and constructive in your responses.

Quiz Context:
${quizContext}

User Question: ${userMessage}`

      let assistantMessage = ""
      setChatMessages((prev) => [...prev, { role: "assistant", content: "" }])

      const result = streamText({
        model: openai("gpt-4o"),
        prompt: systemPrompt,
        onChunk: ({ chunk }) => {
          if (chunk.type === "text-delta") {
            assistantMessage += chunk.text
            setChatMessages((prev) => {
              const newMessages = [...prev]
              newMessages[newMessages.length - 1] = {
                role: "assistant",
                content: assistantMessage,
              }
              return newMessages
            })
          }
        },
      })

      await result.text
    } catch (error) {
      console.error("Error sending chat message:", error)
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ])
    } finally {
      setIsStreaming(false)
    }
  }

  if (!user || !quiz || !attempt) return null

  const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quiz Results</h1>
                <p className="text-gray-600">{quiz.title}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowChatbot(!showChatbot)}
              variant={showChatbot ? "default" : "outline"}
              className={showChatbot ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {showChatbot ? "Hide" : "Show"} AI Tutor
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className={`grid gap-8 ${showChatbot ? "lg:grid-cols-2" : "max-w-4xl mx-auto"}`}>
          {/* Results Section */}
          <div className="space-y-6">
            {/* Score Card */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Your Score</CardTitle>
                    <CardDescription>Completed on {new Date(attempt.completedAt).toLocaleDateString()}</CardDescription>
                  </div>
                  <Trophy className="h-12 w-12 text-yellow-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${getScoreColor(percentage)}`}>{percentage}%</div>
                    <div className="text-xl text-gray-600 mt-2">
                      {attempt.score} out of {attempt.totalQuestions} correct
                    </div>
                  </div>

                  <Progress value={percentage} className="h-4" />

                  <div className="flex justify-center">
                    <Badge className={getScoreBadgeColor(percentage)}>
                      {percentage >= 80 ? "Excellent!" : percentage >= 60 ? "Good Job!" : "Keep Practicing!"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Time: {formatTime(attempt.timeElapsed)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Review */}
            <Card>
              <CardHeader>
                <CardTitle>Question Review</CardTitle>
                <CardDescription>Review your answers and see the correct solutions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {quiz.questions.map((question, index) => {
                    const userAnswer = attempt.answers[question.id]
                    const isCorrect = userAnswer === question.correctAnswer

                    return (
                      <div key={question.id} className="border rounded-lg p-4">
                        <div className="flex items-start space-x-3 mb-3">
                          {isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 mt-1 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-2">Question {index + 1}</h4>
                            <p className="text-gray-700 mb-3">{question.question}</p>
                          </div>
                        </div>

                        <div className="ml-8 space-y-2">
                          {question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`p-2 rounded border ${
                                optIndex === question.correctAnswer
                                  ? "bg-green-50 border-green-200 text-green-800"
                                  : optIndex === userAnswer && !isCorrect
                                    ? "bg-red-50 border-red-200 text-red-800"
                                    : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                                <span>{option}</span>
                                {optIndex === question.correctAnswer && (
                                  <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800">
                                    Correct
                                  </Badge>
                                )}
                                {optIndex === userAnswer && optIndex !== question.correctAnswer && (
                                  <Badge variant="secondary" className="ml-auto bg-red-100 text-red-800">
                                    Your Answer
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chatbot Section */}
          {showChatbot && (
            <div className="space-y-6">
              <Card className="h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5" />
                    <span>AI Tutor</span>
                  </CardTitle>
                  <CardDescription>Ask questions about your quiz performance or get explanations</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ScrollArea className="flex-1 pr-4 mb-4">
                    <div className="space-y-4">
                      {chatMessages.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-sm">Ask me anything about your quiz results!</p>
                          <p className="text-xs mt-2 text-gray-400">
                            Try: "Why was question 3 wrong?" or "Explain the correct answer for question 1"
                          </p>
                        </div>
                      )}

                      {chatMessages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      ))}

                      {isStreaming && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="animate-pulse">Thinking...</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="flex space-x-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about your quiz results..."
                      onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                      disabled={isStreaming}
                    />
                    <Button onClick={sendChatMessage} disabled={!chatInput.trim() || isStreaming} size="sm">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
